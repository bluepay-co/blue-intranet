import { pool } from '../database/pool';
import { Role } from '../models/usuario.model';
import {
  StatusChamado,
  CategoriaChamado,
  CriticidadeChamado,
} from '../models/chamado.model';
import type {
  ChamadoLista,
  ChamadoDetalhe,
  ComentarioPublico,
  ChamadoResumo,
  DashboardTI,
  ContagemRotulo,
  TendenciaDia,
} from '../models/chamado.model';
import type { AuthPayload } from '../middleware/auth.middleware';
import { AppError } from '../utils/app-error';
import { criptografar, descriptografar } from '../utils/crypto-chamados';
import { notificarNovoChamado } from '../utils/slack';

const STATUS_VALIDOS = new Set<string>(Object.values(StatusChamado));
const CATEGORIAS_VALIDAS = new Set<string>(Object.values(CategoriaChamado));
const CRITICIDADES_VALIDAS = new Set<string>(Object.values(CriticidadeChamado));

/** Membros da equipe de T.I. — enxergam e gerenciam todos os chamados. */
function ehEquipeTI(role: Role): boolean {
  return role === Role.TI || role === Role.DESENVOLVEDOR;
}

/** Valida e normaliza o id do chamado vindo da rota. */
function validarId(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('Identificador de chamado inválido.', 400);
  }
  return n;
}

interface NovoChamado {
  titulo: string;
  descricao: string;
  categoria: string;
  criticidade: string;
  anexoUrl: string | null;
  anexoNome: string | null;
  anexoMime: string | null;
  identificadorUrl: string | null;
}

/** Cria um novo chamado (sempre nasce com status ABERTO). */
export async function criarChamado(usuarioId: number, dados: NovoChamado): Promise<{ id: number }> {
  const titulo = dados.titulo?.trim() ?? '';
  const descricao = dados.descricao?.trim() ?? '';

  if (!titulo) throw new AppError('Título é obrigatório.', 400);
  if (titulo.length > 200) throw new AppError('Título excede 200 caracteres.', 400);
  if (!descricao) throw new AppError('Descrição é obrigatória.', 400);
  if (!CATEGORIAS_VALIDAS.has(dados.categoria)) throw new AppError('Categoria inválida.', 400);
  if (!CRITICIDADES_VALIDAS.has(dados.criticidade)) throw new AppError('Criticidade inválida.', 400);

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO chamados
       (titulo, descricao, categoria, criticidade, status, anexo_url, anexo_nome, anexo_mime, identificador_url, usuario_id)
     VALUES ($1, $2, $3, $4, 'ABERTO', $5, $6, $7, $8, $9)
     RETURNING id`,
    [titulo, descricao, dados.categoria, dados.criticidade, dados.anexoUrl, dados.anexoNome, dados.anexoMime, dados.identificadorUrl, usuarioId],
  );

  if (!rows[0]) throw new AppError('Falha ao persistir o chamado.', 500);

  // Notificação Slack em background — não bloqueia nem quebra o fluxo.
  pool
    .query<{ nome: string; role: string }>('SELECT nome, role FROM usuarios WHERE id = $1', [usuarioId])
    .then(({ rows: u }) => {
      const webhook = u[0]?.role === Role.CX
        ? 'SLACK_WEBHOOK_PRODUTOS'
        : 'SLACK_WEBHOOK_CHAMADOS';

      notificarNovoChamado({
        id: rows[0].id,
        titulo,
        descricao: dados.descricao,
        categoria: dados.categoria,
        criticidade: dados.criticidade,
        status: StatusChamado.ABERTO,
        autorNome: u[0]?.nome ?? 'Colaborador',
      }, webhook);
    })
    .catch(() => undefined);

  return rows[0];
}

/** Lista os chamados do próprio colaborador (painel pessoal). */
export async function listarMeusChamados(usuarioId: number): Promise<ChamadoLista[]> {
  const { rows } = await pool.query<ChamadoLista>(
    `SELECT c.id, c.titulo, c.categoria, c.criticidade, c.status,
            (c.anexo_url IS NOT NULL) AS tem_anexo, c.identificador_url,
            c.usuario_id AS autor_id, u.nome AS autor_nome,
            c.criado_em, c.atualizado_em
       FROM chamados c
       JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.usuario_id = $1
      ORDER BY c.criado_em DESC`,
    [usuarioId],
  );
  return rows;
}

interface FiltrosChamado {
  status?: string | undefined;
  categoria?: string | undefined;
  criticidade?: string | undefined;
  busca?: string | undefined;
}

/**
 * Lista TODOS os chamados da fila da T.I. (exclusivo T.I.), com filtros
 * opcionais. Exclui os chamados abertos por usuários CX — esses pertencem à
 * fila de Produtos (fluxo "CX → Produtos", ver `listarChamadosProdutos`).
 */
export async function listarTodos(filtros: FiltrosChamado = {}): Promise<ChamadoLista[]> {
  const params: unknown[] = [Role.CX];
  const condicoes: string[] = [`u.role <> $${params.length}`];

  if (filtros.status && STATUS_VALIDOS.has(filtros.status)) {
    params.push(filtros.status);
    condicoes.push(`c.status = $${params.length}`);
  }
  if (filtros.categoria && CATEGORIAS_VALIDAS.has(filtros.categoria)) {
    params.push(filtros.categoria);
    condicoes.push(`c.categoria = $${params.length}`);
  }
  if (filtros.criticidade && CRITICIDADES_VALIDAS.has(filtros.criticidade)) {
    params.push(filtros.criticidade);
    condicoes.push(`c.criticidade = $${params.length}`);
  }
  if (filtros.busca?.trim()) {
    params.push(`%${filtros.busca.trim().toLowerCase()}%`);
    condicoes.push(`(LOWER(c.titulo) LIKE $${params.length} OR LOWER(u.nome) LIKE $${params.length})`);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;

  const { rows } = await pool.query<ChamadoLista>(
    `SELECT c.id, c.titulo, c.categoria, c.criticidade, c.status,
            (c.anexo_url IS NOT NULL) AS tem_anexo, c.identificador_url,
            c.usuario_id AS autor_id, u.nome AS autor_nome,
            at.nome AS atendente_nome,
            c.criado_em, c.atualizado_em
       FROM chamados c
       JOIN usuarios u ON u.id = c.usuario_id
       LEFT JOIN usuarios at ON at.id = c.atendente_id
       ${where}
      ORDER BY c.criado_em DESC`,
    params,
  );
  return rows;
}

/** Lista todos os chamados abertos por membros de um role específico, com busca opcional por colaborador. */
async function listarChamadosPorRole(role: Role, filtros: { busca?: string } = {}): Promise<ChamadoLista[]> {
  const params: unknown[] = [];
  const condicoes: string[] = [`u.role = $1`];
  params.push(role);

  if (filtros.busca?.trim()) {
    params.push(`%${filtros.busca.trim().toLowerCase()}%`);
    condicoes.push(`LOWER(u.nome) LIKE $${params.length}`);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;

  const { rows } = await pool.query<ChamadoLista>(
    `SELECT c.id, c.titulo, c.categoria, c.criticidade, c.status,
            (c.anexo_url IS NOT NULL) AS tem_anexo, c.identificador_url,
            c.usuario_id AS autor_id, u.nome AS autor_nome,
            c.criado_em, c.atualizado_em
       FROM chamados c
       JOIN usuarios u ON u.id = c.usuario_id
       ${where}
      ORDER BY c.criado_em DESC`,
    params,
  );
  return rows;
}

/** Lista chamados do CX para o time de Produtos (mesma fonte de dados). */
export async function listarChamadosProdutos(filtros: { busca?: string } = {}): Promise<ChamadoLista[]> {
  return listarChamadosPorRole(Role.CX, filtros);
}

/** Busca a ficha completa + chat, aplicando o isolamento (dono ou T.I.). */
export async function buscarChamado(idBruto: unknown, usuario: AuthPayload): Promise<ChamadoDetalhe> {
  const id = validarId(idBruto);

  const { rows } = await pool.query<{
    id: number;
    titulo: string;
    descricao: string;
    categoria: CategoriaChamado;
    criticidade: CriticidadeChamado;
    status: StatusChamado;
    anexo_url: string | null;
    anexo_nome: string | null;
    anexo_mime: string | null;
    autor_id: number;
    autor_nome: string;
    autor_email: string;
    autor_role: Role;
    atendente_id: number | null;
    criado_em: Date;
    atualizado_em: Date;
  }>(
    `SELECT c.id, c.titulo, c.descricao, c.categoria, c.criticidade, c.status,
            c.anexo_url, c.anexo_nome, c.anexo_mime, c.identificador_url,
            c.usuario_id AS autor_id, u.nome AS autor_nome, u.email AS autor_email,
            u.role AS autor_role, c.atendente_id, c.criado_em, c.atualizado_em
       FROM chamados c
       JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.id = $1`,
    [id],
  );

  const chamado = rows[0];
  if (!chamado) throw new AppError('Chamado não encontrado.', 404);

  const ehDono = chamado.autor_id === usuario.id;
  const ehCXVendoCX = usuario.role === Role.CX && chamado.autor_role === Role.CX;
  const ehProdutosVendoCX = usuario.role === Role.PRODUTOS && chamado.autor_role === Role.CX;

  if (!ehDono && !ehEquipeTI(usuario.role) && !ehCXVendoCX && !ehProdutosVendoCX) {
    throw new AppError('Você não tem acesso a este chamado.', 403);
  }

  const comentarios = await listarComentarios(id);
  return { ...chamado, comentarios };
}

/** Carrega e descriptografa os comentários de um chamado (ordem cronológica). */
async function listarComentarios(chamadoId: number): Promise<ComentarioPublico[]> {
  const { rows } = await pool.query<{
    id: number;
    chamado_id: number;
    autor_id: number;
    autor_nome: string;
    conteudo_cifrado: string;
    iv: string;
    auth_tag: string;
    criado_em: Date;
  }>(
    `SELECT cc.id, cc.chamado_id, cc.usuario_id AS autor_id, cu.nome AS autor_nome,
            cc.conteudo_cifrado, cc.iv, cc.auth_tag, cc.criado_em
       FROM chamado_comentarios cc
       JOIN usuarios cu ON cu.id = cc.usuario_id
      WHERE cc.chamado_id = $1
      ORDER BY cc.criado_em ASC`,
    [chamadoId],
  );

  return rows.map((r) => ({
    id: r.id,
    chamado_id: r.chamado_id,
    autor_id: r.autor_id,
    autor_nome: r.autor_nome,
    conteudo: descriptografar({ conteudo: r.conteudo_cifrado, iv: r.iv, authTag: r.auth_tag }),
    criado_em: r.criado_em,
  }));
}

/** Edita título/descrição — só o dono e somente enquanto status = ABERTO. */
export async function editarChamado(
  idBruto: unknown,
  usuarioId: number,
  dados: { titulo: string; descricao: string },
): Promise<{ id: number }> {
  const id = validarId(idBruto);
  const titulo = dados.titulo?.trim() ?? '';
  const descricao = dados.descricao?.trim() ?? '';

  if (!titulo) throw new AppError('Título é obrigatório.', 400);
  if (titulo.length > 200) throw new AppError('Título excede 200 caracteres.', 400);
  if (!descricao) throw new AppError('Descrição é obrigatória.', 400);

  const { rows } = await pool.query<{ usuario_id: number; status: StatusChamado }>(
    `SELECT usuario_id, status FROM chamados WHERE id = $1`,
    [id],
  );
  const atual = rows[0];
  if (!atual) throw new AppError('Chamado não encontrado.', 404);
  if (atual.usuario_id !== usuarioId) throw new AppError('Você não pode editar este chamado.', 403);
  if (atual.status !== StatusChamado.ABERTO) {
    throw new AppError('O chamado já está em atendimento e não pode mais ser editado.', 409);
  }

  await pool.query(
    `UPDATE chamados SET titulo = $1, descricao = $2, atualizado_em = now() WHERE id = $3`,
    [titulo, descricao, id],
  );
  return { id };
}

/** Altera o status do chamado (exclusivo T.I. — garantido na rota). */
export async function alterarStatus(
  idBruto: unknown,
  atendenteId: number,
  novoStatus: unknown,
): Promise<{ id: number; status: StatusChamado }> {
  const id = validarId(idBruto);
  if (typeof novoStatus !== 'string' || !STATUS_VALIDOS.has(novoStatus)) {
    throw new AppError('Status inválido.', 400);
  }

  const assumindo = novoStatus === StatusChamado.EM_ANDAMENTO;
  const fechando = novoStatus === StatusChamado.FECHADO;
  const { rows } = await pool.query<{ id: number; status: StatusChamado }>(
    `UPDATE chamados
        SET status = $1,
            atendente_id = CASE
              WHEN $2 AND atendente_id IS NULL THEN $3
              ELSE atendente_id END,
            fechado_em = CASE WHEN $4 THEN now() ELSE NULL END,
            atualizado_em = now()
      WHERE id = $5
      RETURNING id, status`,
    [novoStatus, assumindo, atendenteId, fechando, id],
  );

  const atualizado = rows[0];
  if (!atualizado) throw new AppError('Chamado não encontrado.', 404);
  return atualizado;
}

/** Adiciona uma mensagem cifrada ao chat (dono ou T.I.). */
export async function adicionarComentario(
  idBruto: unknown,
  usuario: AuthPayload,
  texto: unknown,
): Promise<ComentarioPublico> {
  const id = validarId(idBruto);
  const conteudo = typeof texto === 'string' ? texto.trim() : '';
  if (!conteudo) throw new AppError('A mensagem não pode ser vazia.', 400);
  if (conteudo.length > 2000) throw new AppError('A mensagem excede 2000 caracteres.', 400);

  const { rows } = await pool.query<{ usuario_id: number }>(
    `SELECT usuario_id FROM chamados WHERE id = $1`,
    [id],
  );
  const dono = rows[0];
  if (!dono) throw new AppError('Chamado não encontrado.', 404);
  if (dono.usuario_id !== usuario.id && !ehEquipeTI(usuario.role)) {
    throw new AppError('Você não tem acesso a este chamado.', 403);
  }

  const cifra = criptografar(conteudo);
  const inserido = await pool.query<{ id: number; criado_em: Date }>(
    `INSERT INTO chamado_comentarios (chamado_id, usuario_id, conteudo_cifrado, iv, auth_tag)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, criado_em`,
    [id, usuario.id, cifra.conteudo, cifra.iv, cifra.authTag],
  );

  const nomeRes = await pool.query<{ nome: string }>(`SELECT nome FROM usuarios WHERE id = $1`, [usuario.id]);

  const novo = inserido.rows[0];
  if (!novo) throw new AppError('Falha ao registrar a mensagem.', 500);

  return {
    id: novo.id,
    chamado_id: id,
    autor_id: usuario.id,
    autor_nome: nomeRes.rows[0]?.nome ?? '',
    conteudo,
    criado_em: novo.criado_em,
  };
}

/** Resumo leve para o polling de notificações (dono → próprios; T.I. → todos). */
/**
 * Resumo leve p/ notificações (badge da sidebar). Para a equipe de T.I., só
 * conta chamados ainda ativos (ABERTO/EM_ANDAMENTO) — chamados finalizados não
 * precisam de mais atenção e não devem inflar a contagem de "não vistos" — e
 * exclui os chamados abertos por usuários CX, que pertencem à fila de Produtos
 * (ver `listarChamadosProdutos`), não à da T.I.
 * Para o autor comum, mantém todos os próprios chamados (ele deve ser avisado
 * mesmo quando o chamado dele é fechado pela T.I.).
 */
export async function resumoChamados(usuario: AuthPayload): Promise<ChamadoResumo[]> {
  const condicoes: string[] = [];
  const params: unknown[] = [];

  if (ehEquipeTI(usuario.role)) {
    condicoes.push(`c.status <> '${StatusChamado.FECHADO}'`);
    params.push(Role.CX);
    condicoes.push(`u.role <> $${params.length}`);
  } else {
    params.push(usuario.id);
    condicoes.push(`c.usuario_id = $${params.length}`);
  }
  const where = `WHERE ${condicoes.join(' AND ')}`;

  const { rows } = await pool.query<ChamadoResumo>(
    `SELECT c.id, c.titulo, c.status, c.usuario_id AS autor_id, c.atualizado_em,
            lc.criado_em AS ultimo_comentario_em,
            lc.usuario_id AS ultimo_comentario_autor_id
       FROM chamados c
       JOIN usuarios u ON u.id = c.usuario_id
       LEFT JOIN LATERAL (
         SELECT criado_em, usuario_id
           FROM chamado_comentarios
          WHERE chamado_id = c.id
          ORDER BY criado_em DESC
          LIMIT 1
       ) lc ON true
       ${where}
      ORDER BY c.atualizado_em DESC`,
    params,
  );
  return rows;
}

/**
 * Métricas globais para o painel da T.I. (agregações em todo o banco).
 * Exclui os chamados abertos por usuários CX — esses pertencem à fila de
 * Produtos (fluxo "CX → Produtos", ver `listarChamadosProdutos`), não à da T.I.
 */
export async function dashboardTI(): Promise<DashboardTI> {
  const kpisRes = await pool.query<{
    ativos: number;
    criticos: number;
    tempo_medio_horas: string | null;
    total_mes: number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE c.status IN ('ABERTO','EM_ANDAMENTO'))::int AS ativos,
       COUNT(*) FILTER (WHERE c.criticidade IN ('ALTO','CRITICO') AND c.status <> 'FECHADO')::int AS criticos,
       AVG(EXTRACT(EPOCH FROM (c.fechado_em - c.criado_em)))
         FILTER (WHERE c.status = 'FECHADO' AND c.fechado_em IS NOT NULL) / 3600 AS tempo_medio_horas,
       COUNT(*) FILTER (WHERE c.criado_em >= date_trunc('month', now()))::int AS total_mes
     FROM chamados c
     JOIN usuarios u ON u.id = c.usuario_id
    WHERE u.role <> $1`,
    [Role.CX],
  );
  const k = kpisRes.rows[0];

  const porStatus = (
    await pool.query<ContagemRotulo>(
      `SELECT c.status AS rotulo, COUNT(*)::int AS total
         FROM chamados c JOIN usuarios u ON u.id = c.usuario_id
        WHERE u.role <> $1
        GROUP BY c.status`,
      [Role.CX],
    )
  ).rows;

  const porSetor = (
    await pool.query<ContagemRotulo>(
      `SELECT u.role AS rotulo, COUNT(*)::int AS total
         FROM chamados c JOIN usuarios u ON u.id = c.usuario_id
        WHERE u.role <> $1
        GROUP BY u.role ORDER BY total DESC`,
      [Role.CX],
    )
  ).rows;

  const porCategoria = (
    await pool.query<ContagemRotulo>(
      `SELECT c.categoria AS rotulo, COUNT(*)::int AS total
         FROM chamados c JOIN usuarios u ON u.id = c.usuario_id
        WHERE u.role <> $1
        GROUP BY c.categoria ORDER BY total DESC`,
      [Role.CX],
    )
  ).rows;

  const tendencia = (
    await pool.query<TendenciaDia>(
      `WITH dias AS (
         SELECT generate_series(
           date_trunc('day', now()) - interval '29 days',
           date_trunc('day', now()),
           interval '1 day'
         )::date AS dia
       )
       SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
              (SELECT COUNT(*)::int FROM chamados c JOIN usuarios u ON u.id = c.usuario_id
                WHERE u.role <> $1 AND date_trunc('day', c.criado_em)::date = d.dia) AS abertos,
              (SELECT COUNT(*)::int FROM chamados c JOIN usuarios u ON u.id = c.usuario_id
                WHERE u.role <> $1 AND c.fechado_em IS NOT NULL AND date_trunc('day', c.fechado_em)::date = d.dia) AS finalizados
         FROM dias d
        ORDER BY d.dia`,
      [Role.CX],
    )
  ).rows;

  return {
    kpis: {
      ativos: k?.ativos ?? 0,
      criticos: k?.criticos ?? 0,
      tempoMedioHoras: k?.tempo_medio_horas != null ? Number(k.tempo_medio_horas) : null,
      totalMes: k?.total_mes ?? 0,
    },
    porStatus,
    porSetor,
    porCategoria,
    tendencia,
  };
}
