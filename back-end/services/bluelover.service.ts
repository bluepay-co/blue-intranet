import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import type {
  BlueloverAdmin,
  BlueloverBloco,
  BlueloverCard,
  BlueloverDetalhe,
} from '../models/bluelover.model';

/** Campos textuais do perfil, já resolvidos pelo controller (arquivo → path). */
export interface PerfilEntrada {
  nome: string;
  cargo: string | null;
  setor: string | null;
  frase: string | null;
  fotoCapaUrl: string | null;
  fotoDestaqueUrl: string | null;
  ordem: number;
}

/** Limites de tamanho espelhando o DDL da migration 2026-08-20_bluelovers.sql. */
const MAX = {
  nome: 150,
  cargo: 120,
  setor: 120,
  frase: 300,
  titulo: 150,
  texto: 4000,
} as const;

/** SQL base da vitrine e do painel — só o que o card precisa. */
const SELECT_CARD_SQL = `
  SELECT b.id, b.nome, b.cargo, b.setor, b.frase, b.foto_capa_url, b.ordem
  FROM blue_intranet.bluelovers b
`;

/**
 * Normaliza um campo de texto opcional: string vazia vira null (o front envia ''
 * quando o usuário limpa o campo) e o excedente de tamanho é barrado.
 */
function opcional(valor: string | null | undefined, max: number, campo: string): string | null {
  const limpo = (valor ?? '').trim();
  if (!limpo) return null;
  if (limpo.length > max) throw new AppError(`${campo} excede ${max} caracteres.`, 400);
  return limpo;
}

/** Idem, mas o campo é obrigatório. */
function obrigatorio(valor: string | null | undefined, max: number, campo: string): string {
  const limpo = (valor ?? '').trim();
  if (!limpo) throw new AppError(`${campo} é obrigatório.`, 400);
  if (limpo.length > max) throw new AppError(`${campo} excede ${max} caracteres.`, 400);
  return limpo;
}

/** Aplica as regras de negócio do perfil antes de qualquer persistência. */
function validarPerfil(entrada: PerfilEntrada) {
  if (!entrada.fotoCapaUrl) {
    throw new AppError('A foto de capa (1080x1350) é obrigatória.', 400);
  }
  if (!Number.isInteger(entrada.ordem) || entrada.ordem < 0) {
    throw new AppError('Ordem inválida.', 400);
  }
  return {
    nome: obrigatorio(entrada.nome, MAX.nome, 'Nome'),
    cargo: opcional(entrada.cargo, MAX.cargo, 'Cargo'),
    setor: opcional(entrada.setor, MAX.setor, 'Setor'),
    frase: opcional(entrada.frase, MAX.frase, 'Frase'),
    fotoCapaUrl: entrada.fotoCapaUrl,
    fotoDestaqueUrl: entrada.fotoDestaqueUrl,
    ordem: entrada.ordem,
  };
}

/** Vitrine pública — apenas perfis publicados. */
export async function listarVitrine(): Promise<BlueloverCard[]> {
  const { rows } = await pool.query<BlueloverCard>(
    `${SELECT_CARD_SQL}
     WHERE b.publicado = true
     ORDER BY b.ordem ASC, b.nome ASC`,
  );
  return rows;
}

/** Painel do Marketing — publicados e rascunhos, com a contagem de seções montadas. */
export async function listarAdmin(): Promise<BlueloverAdmin[]> {
  const { rows } = await pool.query<BlueloverAdmin>(
    `SELECT b.id, b.nome, b.cargo, b.setor, b.frase, b.foto_capa_url, b.ordem,
            b.foto_destaque_url, b.publicado, b.criado_em, b.atualizado_em,
            COUNT(bl.id)::int AS total_blocos
     FROM blue_intranet.bluelovers b
     LEFT JOIN blue_intranet.bluelover_blocos bl ON bl.bluelover_id = b.id
     GROUP BY b.id
     ORDER BY b.ordem ASC, b.nome ASC`,
  );
  return rows;
}

/**
 * Perfil completo com suas seções.
 * @param apenasPublicado quando true (rota pública), rascunho responde 404.
 */
export async function buscarPerfil(
  id: number,
  apenasPublicado: boolean,
): Promise<BlueloverDetalhe> {
  const { rows } = await pool.query<BlueloverDetalhe>(
    `SELECT * FROM blue_intranet.bluelovers
     WHERE id = $1 ${apenasPublicado ? 'AND publicado = true' : ''}`,
    [id],
  );
  const perfil = rows[0];
  if (!perfil) throw new AppError('Perfil não encontrado.', 404);

  const { rows: blocos } = await pool.query<BlueloverBloco>(
    `SELECT * FROM blue_intranet.bluelover_blocos
     WHERE bluelover_id = $1
     ORDER BY ordem ASC, id ASC`,
    [id],
  );

  return { ...perfil, blocos };
}

/** Cria o perfil. As seções são adicionadas depois, pelo editor. */
export async function criarPerfil(
  criadoPor: number,
  entrada: PerfilEntrada,
): Promise<{ id: number }> {
  const dados = validarPerfil(entrada);

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO blue_intranet.bluelovers
       (nome, cargo, setor, frase, foto_capa_url, foto_destaque_url, ordem, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      dados.nome,
      dados.cargo,
      dados.setor,
      dados.frase,
      dados.fotoCapaUrl,
      dados.fotoDestaqueUrl,
      dados.ordem,
      criadoPor,
    ],
  );
  if (!rows[0]) throw new AppError('Falha ao persistir o perfil.', 500);
  return rows[0];
}

/**
 * Edita o perfil e devolve os paths das imagens que foram SUBSTITUÍDAS, para o
 * controller apagá-las do disco. A leitura precede o UPDATE porque `RETURNING`
 * devolve os valores novos, não os antigos.
 */
export async function editarPerfil(
  id: number,
  entrada: PerfilEntrada,
): Promise<{ orfas: string[] }> {
  const dados = validarPerfil(entrada);

  const { rows } = await pool.query<{
    foto_capa_url: string;
    foto_destaque_url: string | null;
  }>(
    `SELECT foto_capa_url, foto_destaque_url FROM blue_intranet.bluelovers WHERE id = $1`,
    [id],
  );
  const anterior = rows[0];
  if (!anterior) throw new AppError('Perfil não encontrado.', 404);

  await pool.query(
    `UPDATE blue_intranet.bluelovers
     SET nome = $1, cargo = $2, setor = $3, frase = $4,
         foto_capa_url = $5, foto_destaque_url = $6, ordem = $7, atualizado_em = now()
     WHERE id = $8`,
    [
      dados.nome,
      dados.cargo,
      dados.setor,
      dados.frase,
      dados.fotoCapaUrl,
      dados.fotoDestaqueUrl,
      dados.ordem,
      id,
    ],
  );

  const orfas = [
    substituida(anterior.foto_capa_url, dados.fotoCapaUrl),
    substituida(anterior.foto_destaque_url, dados.fotoDestaqueUrl),
  ].filter((path): path is string => path !== null);

  return { orfas };
}

/** Path antigo que deixou de ser referenciado, ou null se continua em uso. */
function substituida(antigo: string | null, novo: string | null): string | null {
  return antigo && antigo !== novo ? antigo : null;
}

/**
 * Remove o perfil e devolve TODOS os paths de imagem envolvidos (capa, destaque
 * e as fotos das seções) para o controller limpar o disco. As seções somem por
 * ON DELETE CASCADE — por isso as fotos são lidas antes.
 */
export async function deletarPerfil(id: number): Promise<string[]> {
  const { rows: fotosBlocos } = await pool.query<{ foto_url: string | null }>(
    `SELECT foto_url FROM blue_intranet.bluelover_blocos WHERE bluelover_id = $1`,
    [id],
  );

  const { rows } = await pool.query<{
    foto_capa_url: string;
    foto_destaque_url: string | null;
  }>(
    `DELETE FROM blue_intranet.bluelovers WHERE id = $1
     RETURNING foto_capa_url, foto_destaque_url`,
    [id],
  );
  const removido = rows[0];
  if (!removido) throw new AppError('Perfil não encontrado.', 404);

  return [
    removido.foto_capa_url,
    removido.foto_destaque_url,
    ...fotosBlocos.map((f) => f.foto_url),
  ].filter((path): path is string => Boolean(path));
}

/**
 * Alterna rascunho ↔ publicado. Diferente do blog (onde despublicar reescreveria
 * a cronologia do feed), tirar um perfil do ar precisa ser possível: a pessoa
 * pode sair da empresa ou a foto pode precisar ser refeita.
 */
export async function alternarPublicacao(id: number): Promise<{ publicado: boolean }> {
  const { rows } = await pool.query<{ publicado: boolean }>(
    `UPDATE blue_intranet.bluelovers
     SET publicado = NOT publicado, atualizado_em = now()
     WHERE id = $1
     RETURNING publicado`,
    [id],
  );
  const atualizado = rows[0];
  if (!atualizado) throw new AppError('Perfil não encontrado.', 404);
  return atualizado;
}

// ─── Seções do perfil ────────────────────────────────────────────────────────

/** Adiciona uma seção ao final do perfil. */
export async function criarBloco(
  blueloverId: number,
  titulo: string,
  texto: string,
  fotoUrl: string | null,
): Promise<BlueloverBloco> {
  const dados = {
    titulo: obrigatorio(titulo, MAX.titulo, 'Título da seção'),
    texto: obrigatorio(texto, MAX.texto, 'Texto da seção'),
  };

  const { rows: perfil } = await pool.query(
    `SELECT id FROM blue_intranet.bluelovers WHERE id = $1`,
    [blueloverId],
  );
  if (!perfil.length) throw new AppError('Perfil não encontrado.', 404);

  const { rows } = await pool.query<BlueloverBloco>(
    `INSERT INTO blue_intranet.bluelover_blocos (bluelover_id, titulo, texto, foto_url, ordem)
     VALUES ($1, $2, $3, $4,
             COALESCE((SELECT MAX(ordem) + 1 FROM blue_intranet.bluelover_blocos
                       WHERE bluelover_id = $1), 0))
     RETURNING *`,
    [blueloverId, dados.titulo, dados.texto, fotoUrl],
  );
  if (!rows[0]) throw new AppError('Falha ao persistir a seção.', 500);
  return rows[0];
}

/** Edita uma seção e devolve a foto substituída, se houver. */
export async function editarBloco(
  blocoId: number,
  titulo: string,
  texto: string,
  fotoUrl: string | null,
): Promise<{ bloco: BlueloverBloco; orfa: string | null }> {
  const dados = {
    titulo: obrigatorio(titulo, MAX.titulo, 'Título da seção'),
    texto: obrigatorio(texto, MAX.texto, 'Texto da seção'),
  };

  const { rows: anteriores } = await pool.query<{ foto_url: string | null }>(
    `SELECT foto_url FROM blue_intranet.bluelover_blocos WHERE id = $1`,
    [blocoId],
  );
  const anterior = anteriores[0];
  if (!anterior) throw new AppError('Seção não encontrada.', 404);

  const { rows } = await pool.query<BlueloverBloco>(
    `UPDATE blue_intranet.bluelover_blocos
     SET titulo = $1, texto = $2, foto_url = $3
     WHERE id = $4
     RETURNING *`,
    [dados.titulo, dados.texto, fotoUrl, blocoId],
  );

  return { bloco: rows[0]!, orfa: substituida(anterior.foto_url, fotoUrl) };
}

/** Remove uma seção e devolve sua foto para o controller apagar do disco. */
export async function deletarBloco(blocoId: number): Promise<string | null> {
  const { rows } = await pool.query<{ foto_url: string | null }>(
    `DELETE FROM blue_intranet.bluelover_blocos WHERE id = $1 RETURNING foto_url`,
    [blocoId],
  );
  const removido = rows[0];
  if (!removido) throw new AppError('Seção não encontrada.', 404);
  return removido.foto_url;
}

/**
 * Reordena as seções de um perfil em uma única query atômica. O filtro por
 * `bluelover_id` impede que ids de outro perfil sejam reposicionados por
 * um payload forjado.
 */
export async function reordenarBlocos(blueloverId: number, ids: number[]): Promise<number> {
  if (!Array.isArray(ids) || !ids.length) {
    throw new AppError('Lista de seções inválida.', 400);
  }
  if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw new AppError('Lista de seções inválida.', 400);
  }

  const { rowCount } = await pool.query(
    `UPDATE blue_intranet.bluelover_blocos b
     SET ordem = novo.pos
     FROM unnest($2::int[]) WITH ORDINALITY AS novo(id, pos)
     WHERE b.id = novo.id AND b.bluelover_id = $1`,
    [blueloverId, ids],
  );
  return rowCount ?? 0;
}
