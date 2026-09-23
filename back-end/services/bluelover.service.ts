import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import type {
  BlueloverAdmin,
  BlueloverBloco,
  BlueloverCard,
  BlueloverDetalhe,
  ChaveConquista,
  TipoBloco,
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
  apelido: string | null;
  dataNascimento: string | null;
  bio: string | null;
  habilidades: unknown;
  talento: string | null;
  gostoComida: string | null;
  gostoAssiste: string | null;
  gostoMusica: string | null;
  gostoCor: string | null;
  gostoRedeSocial: string | null;
  gostoEmoji: string | null;
  hobby: string | null;
  presentePerfeito: string | null;
  rotulosGostos: unknown;
  viagemFavoritaTexto: string | null;
  viagemFavoritaFotoUrl: string | null;
  viagemSonho: string | null;
  viagemSonhoFotoUrl: string | null;
  inspiracaoTexto: string | null;
  inspiracaoFotoUrl: string | null;
  bluepayPessoaTexto: string | null;
  bluepayPessoaFotoUrl: string | null;
  momentoMarcante: string | null;
  momentoMarcanteFotoUrl: string | null;
}

/** Card da seção 02 ou momento da timeline (seção 06). */
export interface BlocoEntrada {
  tipo: string | null;
  chave: string | null;
  titulo: string;
  texto: string;
  rotuloData: string | null;
  fotoUrl: string | null;
}

const TIPOS_BLOCO: TipoBloco[] = ['conquista', 'momento', 'livre'];
const CHAVES_CONQUISTA: ChaveConquista[] = [
  'realizacao_pessoal',
  'realizacao_profissional',
  'sonho',
  'desenvolver',
];
const MAX_HABILIDADES = 3;
const CAMPOS_GOSTO = [
  'gosto_comida',
  'gosto_assiste',
  'gosto_musica',
  'gosto_cor',
  'gosto_rede_social',
  'gosto_emoji',
  'hobby',
  'presente_perfeito',
];
const DATA_OK = /^\d{4}-\d{2}-\d{2}$/;

/** Limites de tamanho espelhando o DDL da migration 2026-08-20_bluelovers.sql. */
const MAX = {
  nome: 150,
  cargo: 120,
  setor: 120,
  frase: 300,
  titulo: 150,
  texto: 4000,
  apelido: 80,
  bio: 400,
  talento: 200,
  hobby: 120,
  habilidade: 60,
  gosto: 120,
  cor: 60,
  emoji: 16,
  viagemTexto: 400,
  viagemSonho: 120,
  inspiracao: 400,
  bluepayPessoa: 400,
  presente: 200,
  momentoMarcante: 600,
  rotuloData: 30,
} as const;

/** SQL base da vitrine e do painel — só o que o card precisa. */
const SELECT_CARD_SQL = `
  SELECT b.id, b.nome, b.cargo, b.setor, b.frase, b.foto_capa_url, b.ordem, b.apelido
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
    apelido: opcional(entrada.apelido, MAX.apelido, 'Apelido'),
    dataNascimento: validarData(entrada.dataNascimento),
    bio: opcional(entrada.bio, MAX.bio, 'Descrição'),
    habilidades: validarHabilidades(entrada.habilidades),
    talento: opcional(entrada.talento, MAX.talento, 'Talento'),
    gostoComida: opcional(entrada.gostoComida, MAX.gosto, 'Comida favorita'),
    gostoAssiste: opcional(entrada.gostoAssiste, MAX.gosto, 'O que assiste'),
    gostoMusica: opcional(entrada.gostoMusica, MAX.gosto, 'Música favorita'),
    gostoCor: opcional(entrada.gostoCor, MAX.cor, 'Cor favorita'),
    gostoRedeSocial: opcional(entrada.gostoRedeSocial, MAX.gosto, 'Rede social'),
    gostoEmoji: opcional(entrada.gostoEmoji, MAX.emoji, 'Emoji'),
    hobby: opcional(entrada.hobby, MAX.hobby, 'Hobby'),
    presentePerfeito: opcional(entrada.presentePerfeito, MAX.presente, 'Presente perfeito'),
    rotulosGostos: validarRotulos(entrada.rotulosGostos),
    viagemFavoritaTexto: opcional(entrada.viagemFavoritaTexto, MAX.viagemTexto, 'Viagem favorita'),
    viagemFavoritaFotoUrl: entrada.viagemFavoritaFotoUrl,
    viagemSonho: opcional(entrada.viagemSonho, MAX.viagemSonho, 'Viagem dos sonhos'),
    viagemSonhoFotoUrl: entrada.viagemSonhoFotoUrl,
    inspiracaoTexto: opcional(entrada.inspiracaoTexto, MAX.inspiracao, 'Inspiração'),
    inspiracaoFotoUrl: entrada.inspiracaoFotoUrl,
    bluepayPessoaTexto: opcional(entrada.bluepayPessoaTexto, MAX.bluepayPessoa, 'Bluepay como pessoa'),
    bluepayPessoaFotoUrl: entrada.bluepayPessoaFotoUrl,
    momentoMarcante: opcional(entrada.momentoMarcante, MAX.momentoMarcante, 'Momento marcante'),
    momentoMarcanteFotoUrl: entrada.momentoMarcanteFotoUrl,
  };
}

function validarData(valor: string | null | undefined): string | null {
  const limpo = (valor ?? '').trim();
  if (!limpo) return null;
  if (!DATA_OK.test(limpo) || Number.isNaN(Date.parse(limpo))) {
    throw new AppError('Data de nascimento inválida.', 400);
  }
  return limpo;
}

/** Só aceita títulos dos campos de gosto conhecidos, cada um com texto curto. */
function validarRotulos(valor: unknown): Record<string, string> {
  if (valor == null || valor === '') return {};
  if (typeof valor !== 'object' || Array.isArray(valor)) {
    throw new AppError('Títulos dos gostos inválidos.', 400);
  }

  const rotulos: Record<string, string> = {};
  for (const [campo, titulo] of Object.entries(valor as Record<string, unknown>)) {
    if (!CAMPOS_GOSTO.includes(campo)) throw new AppError('Títulos dos gostos inválidos.', 400);
    const limpo = opcional(typeof titulo === 'string' ? titulo : '', MAX.gosto, 'Título do card');
    if (limpo) rotulos[campo] = limpo;
  }
  return rotulos;
}

function validarHabilidades(valor: unknown): string[] {
  if (valor == null || valor === '') return [];
  if (!Array.isArray(valor)) throw new AppError('Habilidades inválidas.', 400);

  const limpas = valor
    .map((h) => (typeof h === 'string' ? h.trim() : ''))
    .filter((h) => h.length > 0);

  if (limpas.length > MAX_HABILIDADES) {
    throw new AppError(`Informe no máximo ${MAX_HABILIDADES} habilidades.`, 400);
  }
  if (limpas.some((h) => h.length > MAX.habilidade)) {
    throw new AppError(`Cada habilidade excede ${MAX.habilidade} caracteres.`, 400);
  }
  return limpas;
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
    `SELECT b.id, b.nome, b.cargo, b.setor, b.frase, b.foto_capa_url, b.ordem, b.apelido,
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
       (nome, cargo, setor, frase, foto_capa_url, foto_destaque_url, ordem, criado_por,
        apelido, data_nascimento, bio, habilidades, talento,
        gosto_comida, gosto_assiste, gosto_musica, gosto_cor, gosto_rede_social, gosto_emoji,
        hobby, presente_perfeito, rotulos_gostos,
        viagem_favorita_texto, viagem_favorita_foto_url, viagem_sonho, viagem_sonho_foto_url,
        inspiracao_texto, inspiracao_foto_url,
        bluepay_pessoa_texto, bluepay_pessoa_foto_url,
        momento_marcante, momento_marcante_foto_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13,
             $14, $15, $16, $17, $18, $19,
             $20, $21, $22,
             $23, $24, $25, $26,
             $27, $28,
             $29, $30,
             $31, $32)
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
      dados.apelido,
      dados.dataNascimento,
      dados.bio,
      dados.habilidades,
      dados.talento,
      dados.gostoComida,
      dados.gostoAssiste,
      dados.gostoMusica,
      dados.gostoCor,
      dados.gostoRedeSocial,
      dados.gostoEmoji,
      dados.hobby,
      dados.presentePerfeito,
      JSON.stringify(dados.rotulosGostos),
      dados.viagemFavoritaTexto,
      dados.viagemFavoritaFotoUrl,
      dados.viagemSonho,
      dados.viagemSonhoFotoUrl,
      dados.inspiracaoTexto,
      dados.inspiracaoFotoUrl,
      dados.bluepayPessoaTexto,
      dados.bluepayPessoaFotoUrl,
      dados.momentoMarcante,
      dados.momentoMarcanteFotoUrl,
    ],
  );
  if (!rows[0]) throw new AppError('Falha ao persistir o perfil.', 500);
  return rows[0];
}

/** Reaponta as imagens do perfil depois que o controller as move para a pasta dele. */
export async function atualizarFotosPerfil(
  id: number,
  fotos: {
    fotoCapaUrl: string | null;
    fotoDestaqueUrl: string | null;
    viagemFavoritaFotoUrl: string | null;
    viagemSonhoFotoUrl: string | null;
    inspiracaoFotoUrl: string | null;
    bluepayPessoaFotoUrl: string | null;
    momentoMarcanteFotoUrl: string | null;
  },
): Promise<void> {
  await pool.query(
    `UPDATE blue_intranet.bluelovers
     SET foto_capa_url = $1, foto_destaque_url = $2, viagem_favorita_foto_url = $3,
         viagem_sonho_foto_url = $4, inspiracao_foto_url = $5, bluepay_pessoa_foto_url = $6,
         momento_marcante_foto_url = $7
     WHERE id = $8`,
    [
      fotos.fotoCapaUrl,
      fotos.fotoDestaqueUrl,
      fotos.viagemFavoritaFotoUrl,
      fotos.viagemSonhoFotoUrl,
      fotos.inspiracaoFotoUrl,
      fotos.bluepayPessoaFotoUrl,
      fotos.momentoMarcanteFotoUrl,
      id,
    ],
  );
}

/** A qual perfil uma seção pertence — o editor de seção não recebe esse id na rota. */
export async function blueloverDoBloco(blocoId: number): Promise<number> {
  const { rows } = await pool.query<{ bluelover_id: number }>(
    `SELECT bluelover_id FROM blue_intranet.bluelover_blocos WHERE id = $1`,
    [blocoId],
  );
  if (!rows[0]) throw new AppError('Seção não encontrada.', 404);
  return rows[0].bluelover_id;
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

  const { rows } = await pool.query<FotosPerfil>(
    `SELECT foto_capa_url, foto_destaque_url, viagem_favorita_foto_url,
            viagem_sonho_foto_url, inspiracao_foto_url, bluepay_pessoa_foto_url,
            momento_marcante_foto_url
     FROM blue_intranet.bluelovers WHERE id = $1`,
    [id],
  );
  const anterior = rows[0];
  if (!anterior) throw new AppError('Perfil não encontrado.', 404);

  await pool.query(
    `UPDATE blue_intranet.bluelovers
     SET nome = $1, cargo = $2, setor = $3, frase = $4,
         foto_capa_url = $5, foto_destaque_url = $6, ordem = $7,
         apelido = $8, data_nascimento = $9, bio = $10, habilidades = $11,
         talento = $12,
         gosto_comida = $13, gosto_assiste = $14, gosto_musica = $15,
         gosto_cor = $16, gosto_rede_social = $17, gosto_emoji = $18,
         hobby = $19, presente_perfeito = $20, rotulos_gostos = $21,
         viagem_favorita_texto = $22, viagem_favorita_foto_url = $23, viagem_sonho = $24,
         viagem_sonho_foto_url = $25,
         inspiracao_texto = $26, inspiracao_foto_url = $27,
         bluepay_pessoa_texto = $28, bluepay_pessoa_foto_url = $29,
         momento_marcante = $30, momento_marcante_foto_url = $31,
         atualizado_em = now()
     WHERE id = $32`,
    [
      dados.nome,
      dados.cargo,
      dados.setor,
      dados.frase,
      dados.fotoCapaUrl,
      dados.fotoDestaqueUrl,
      dados.ordem,
      dados.apelido,
      dados.dataNascimento,
      dados.bio,
      dados.habilidades,
      dados.talento,
      dados.gostoComida,
      dados.gostoAssiste,
      dados.gostoMusica,
      dados.gostoCor,
      dados.gostoRedeSocial,
      dados.gostoEmoji,
      dados.hobby,
      dados.presentePerfeito,
      JSON.stringify(dados.rotulosGostos),
      dados.viagemFavoritaTexto,
      dados.viagemFavoritaFotoUrl,
      dados.viagemSonho,
      dados.viagemSonhoFotoUrl,
      dados.inspiracaoTexto,
      dados.inspiracaoFotoUrl,
      dados.bluepayPessoaTexto,
      dados.bluepayPessoaFotoUrl,
      dados.momentoMarcante,
      dados.momentoMarcanteFotoUrl,
      id,
    ],
  );

  const orfas = [
    substituida(anterior.foto_capa_url, dados.fotoCapaUrl),
    substituida(anterior.foto_destaque_url, dados.fotoDestaqueUrl),
    substituida(anterior.viagem_favorita_foto_url, dados.viagemFavoritaFotoUrl),
    substituida(anterior.viagem_sonho_foto_url, dados.viagemSonhoFotoUrl),
    substituida(anterior.inspiracao_foto_url, dados.inspiracaoFotoUrl),
    substituida(anterior.bluepay_pessoa_foto_url, dados.bluepayPessoaFotoUrl),
    substituida(anterior.momento_marcante_foto_url, dados.momentoMarcanteFotoUrl),
  ].filter((path): path is string => path !== null);

  return { orfas };
}

/** Todas as imagens guardadas na própria linha do perfil. */
interface FotosPerfil {
  momento_marcante_foto_url: string | null;
  foto_capa_url: string;
  foto_destaque_url: string | null;
  viagem_favorita_foto_url: string | null;
  viagem_sonho_foto_url: string | null;
  inspiracao_foto_url: string | null;
  bluepay_pessoa_foto_url: string | null;
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

  const { rows } = await pool.query<FotosPerfil>(
    `DELETE FROM blue_intranet.bluelovers WHERE id = $1
     RETURNING foto_capa_url, foto_destaque_url, viagem_favorita_foto_url,
               viagem_sonho_foto_url, inspiracao_foto_url, bluepay_pessoa_foto_url,
               momento_marcante_foto_url`,
    [id],
  );
  const removido = rows[0];
  if (!removido) throw new AppError('Perfil não encontrado.', 404);

  return [
    removido.foto_capa_url,
    removido.foto_destaque_url,
    removido.viagem_favorita_foto_url,
    removido.viagem_sonho_foto_url,
    removido.inspiracao_foto_url,
    removido.bluepay_pessoa_foto_url,
    removido.momento_marcante_foto_url,
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

/** Valida tipo, chave e rótulo conforme a seção de destino. */
function validarBloco(entrada: BlocoEntrada) {
  const tipo = (entrada.tipo ?? 'livre') as TipoBloco;
  if (!TIPOS_BLOCO.includes(tipo)) throw new AppError('Tipo de seção inválido.', 400);

  const chaveBruta = (entrada.chave ?? '').trim();
  if (tipo === 'conquista') {
    if (!CHAVES_CONQUISTA.includes(chaveBruta as ChaveConquista)) {
      throw new AppError('Conquista inválida.', 400);
    }
  } else if (chaveBruta) {
    throw new AppError('Somente conquistas aceitam uma chave.', 400);
  }

  return {
    tipo,
    chave: tipo === 'conquista' ? (chaveBruta as ChaveConquista) : null,
    titulo: obrigatorio(entrada.titulo, MAX.titulo, 'Título da seção'),
    texto: obrigatorio(entrada.texto, MAX.texto, 'Texto da seção'),
    rotuloData:
      tipo === 'momento' ? opcional(entrada.rotuloData, MAX.rotuloData, 'Data do momento') : null,
    fotoUrl: entrada.fotoUrl,
  };
}

/** O índice único (perfil, chave) impede dois cards da mesma conquista. */
function traduzirConflito(err: unknown): never {
  if ((err as { code?: string }).code === '23505') {
    throw new AppError('Este perfil já tem um card para essa conquista.', 409);
  }
  throw err;
}

/** Adiciona uma seção ao final do perfil. */
export async function criarBloco(
  blueloverId: number,
  entrada: BlocoEntrada,
): Promise<BlueloverBloco> {
  const dados = validarBloco(entrada);

  const { rows: perfil } = await pool.query(
    `SELECT id FROM blue_intranet.bluelovers WHERE id = $1`,
    [blueloverId],
  );
  if (!perfil.length) throw new AppError('Perfil não encontrado.', 404);

  try {
    const { rows } = await pool.query<BlueloverBloco>(
      `INSERT INTO blue_intranet.bluelover_blocos
         (bluelover_id, tipo, chave, titulo, texto, rotulo_data, foto_url, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               COALESCE((SELECT MAX(ordem) + 1 FROM blue_intranet.bluelover_blocos
                         WHERE bluelover_id = $1), 0))
       RETURNING *`,
      [
        blueloverId,
        dados.tipo,
        dados.chave,
        dados.titulo,
        dados.texto,
        dados.rotuloData,
        dados.fotoUrl,
      ],
    );
    if (!rows[0]) throw new AppError('Falha ao persistir a seção.', 500);
    return rows[0];
  } catch (err) {
    traduzirConflito(err);
  }
}

/** Edita uma seção e devolve a foto substituída, se houver. */
export async function editarBloco(
  blocoId: number,
  entrada: BlocoEntrada,
): Promise<{ bloco: BlueloverBloco; orfa: string | null }> {
  const dados = validarBloco(entrada);

  const { rows: anteriores } = await pool.query<{ foto_url: string | null }>(
    `SELECT foto_url FROM blue_intranet.bluelover_blocos WHERE id = $1`,
    [blocoId],
  );
  const anterior = anteriores[0];
  if (!anterior) throw new AppError('Seção não encontrada.', 404);

  try {
    const { rows } = await pool.query<BlueloverBloco>(
      `UPDATE blue_intranet.bluelover_blocos
       SET tipo = $1, chave = $2, titulo = $3, texto = $4, rotulo_data = $5, foto_url = $6
       WHERE id = $7
       RETURNING *`,
      [
        dados.tipo,
        dados.chave,
        dados.titulo,
        dados.texto,
        dados.rotuloData,
        dados.fotoUrl,
        blocoId,
      ],
    );
    return { bloco: rows[0]!, orfa: substituida(anterior.foto_url, dados.fotoUrl) };
  } catch (err) {
    traduzirConflito(err);
  }
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
