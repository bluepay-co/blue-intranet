import { pool } from '../database/pool';
import { AppError } from '../utils/app-error';
import { criptografar, descriptografar } from '../utils/crypto-chat';
import type { CanalListaItem, MensagemPublica } from '../models/chat.model';

/** Mapeia a role do usuário para o nome do canal de setor correspondente. */
function roleParaNomeCanal(role: string): string {
  if (role === 'COLABORADOR') return 'geral';
  return role.toLowerCase();
}

/**
 * Garante que o canal de setor existe e que o usuário é membro.
 * Chamado no login (fire-and-forget) para que o canal seja criado de forma idempotente.
 */
export async function garantirCanalSetor(role: string, usuarioId: number): Promise<void> {
  const nomeCanal = roleParaNomeCanal(role);

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO chat_canais (tipo, nome)
     VALUES ('SETOR', $1)
     ON CONFLICT (tipo, nome) WHERE tipo IN ('SETOR', 'CUSTOMIZADO') DO NOTHING
     RETURNING id`,
    [nomeCanal],
  );

  let canalId: number;
  if (rows.length > 0) {
    canalId = rows[0]!.id;
  } else {
    const { rows: existing } = await pool.query<{ id: number }>(
      `SELECT id FROM chat_canais WHERE tipo = 'SETOR' AND nome = $1`,
      [nomeCanal],
    );
    if (!existing[0]) throw new AppError('Canal de setor não encontrado.', 500);
    canalId = existing[0].id;
  }

  await pool.query(
    `INSERT INTO chat_canal_membros (canal_id, usuario_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [canalId, usuarioId],
  );
}

/** Busca um canal privado existente entre dois usuários, ou cria um novo. */
export async function buscarOuCriarCanalPrivado(
  usuarioAId: number,
  usuarioBId: number,
): Promise<{ canal_id: number; novo: boolean }> {
  if (usuarioAId === usuarioBId) {
    throw new AppError('Não é possível criar uma conversa consigo mesmo.', 400);
  }

  // Verifica se o outro usuário existe
  const { rows: dest } = await pool.query<{ id: number }>(
    `SELECT id FROM usuarios WHERE id = $1`,
    [usuarioBId],
  );
  if (!dest[0]) throw new AppError('Usuário destinatário não encontrado.', 404);

  // Busca canal PRIVADO onde ambos são membros
  const { rows: existing } = await pool.query<{ canal_id: number }>(
    `SELECT cm.canal_id
     FROM chat_canal_membros cm
     JOIN chat_canais cc ON cc.id = cm.canal_id
     WHERE cm.usuario_id = $1 AND cc.tipo = 'PRIVADO'
     INTERSECT
     SELECT cm2.canal_id
     FROM chat_canal_membros cm2
     WHERE cm2.usuario_id = $2`,
    [usuarioAId, usuarioBId],
  );

  if (existing[0]) {
    return { canal_id: existing[0].canal_id, novo: false };
  }

  // Cria novo canal privado
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO chat_canais (tipo, criado_por) VALUES ('PRIVADO', $1) RETURNING id`,
    [usuarioAId],
  );
  const canalId = rows[0]!.id;

  await pool.query(
    `INSERT INTO chat_canal_membros (canal_id, usuario_id) VALUES ($1, $2), ($1, $3)`,
    [canalId, usuarioAId, usuarioBId],
  );

  return { canal_id: canalId, novo: true };
}

/** Cria um canal customizado com o criador e os membros convidados. */
export async function criarCanalCustomizado(
  criadorId: number,
  nome: string,
  membroIds: number[],
): Promise<number> {
  if (!nome || nome.trim().length === 0) {
    throw new AppError('O nome do canal é obrigatório.', 400);
  }
  if (nome.trim().length > 100) {
    throw new AppError('O nome do canal deve ter no máximo 100 caracteres.', 400);
  }

  const nomeTrimmed = nome.trim().toLowerCase();

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO chat_canais (tipo, nome, criado_por) VALUES ('CUSTOMIZADO', $1, $2) RETURNING id`,
    [nomeTrimmed, criadorId],
  );
  const canalId = rows[0]!.id;

  // Garante que o criador está incluído
  const todos = Array.from(new Set([criadorId, ...membroIds]));
  const valores = todos.map((uid, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO chat_canal_membros (canal_id, usuario_id) VALUES ${valores}`,
    [canalId, ...todos],
  );

  return canalId;
}

/** Lista todos os canais dos quais o usuário é membro, com unread count e preview. */
export async function listarCanaisDoUsuario(usuarioId: number): Promise<CanalListaItem[]> {
  const { rows } = await pool.query<CanalListaItem & { outro_id: number | null }>(
    `SELECT
       cc.id,
       cc.tipo,
       cc.nome,
       -- Para canais PRIVADO: retorna o nome do outro participante
       CASE WHEN cc.tipo = 'PRIVADO' THEN u_outro.nome ELSE NULL END AS nome_outro_usuario,
       u_outro.id AS outro_id,
       COALESCE(
         (SELECT COUNT(*)::int
          FROM chat_mensagens m
          WHERE m.canal_id = cc.id
            AND m.deletada = false
            AND m.usuario_id <> $1
            AND m.criado_em > COALESCE(
              (SELECT ultima_leitura_em FROM chat_leituras WHERE canal_id = cc.id AND usuario_id = $1),
              '-infinity'::timestamptz
            )
         ), 0
       ) AS unread_count,
       ult.conteudo_cifrado AS ultima_mensagem_preview,
       ult.iv AS ult_iv,
       ult.auth_tag AS ult_auth_tag,
       ult.criado_em AS ultima_mensagem_em
     FROM chat_canal_membros cm
     JOIN chat_canais cc ON cc.id = cm.canal_id
     -- Para DMs: encontra o outro usuário
     LEFT JOIN chat_canal_membros cm2
       ON cm2.canal_id = cc.id AND cm2.usuario_id <> $1 AND cc.tipo = 'PRIVADO'
     LEFT JOIN usuarios u_outro ON u_outro.id = cm2.usuario_id
     -- Última mensagem via LATERAL
     LEFT JOIN LATERAL (
       SELECT conteudo_cifrado, iv, auth_tag, criado_em
       FROM chat_mensagens
       WHERE canal_id = cc.id AND deletada = false
       ORDER BY criado_em DESC
       LIMIT 1
     ) ult ON true
     WHERE cm.usuario_id = $1
     ORDER BY COALESCE(ult.criado_em, cc.criado_em) DESC`,
    [usuarioId],
  );

  return rows.map((row) => {
    let preview: string | null = null;
    if (row.ultima_mensagem_preview && (row as any).ult_iv && (row as any).ult_auth_tag) {
      try {
        const full = descriptografar({
          conteudo: row.ultima_mensagem_preview,
          iv: (row as any).ult_iv,
          authTag: (row as any).ult_auth_tag,
        });
        preview = full.length > 60 ? full.slice(0, 60) + '…' : full;
      } catch {
        preview = '[mensagem]';
      }
    } else if (row.ultima_mensagem_em) {
      preview = '[Arquivo]';
    }

    return {
      id: row.id,
      tipo: row.tipo,
      nome: row.nome,
      nome_outro_usuario: row.nome_outro_usuario,
      unread_count: row.unread_count,
      ultima_mensagem_preview: preview,
      ultima_mensagem_em: row.ultima_mensagem_em,
    };
  });
}

/** Conta total de mensagens não lidas em todos os canais do usuário. */
export async function contarNaoLidos(usuarioId: number): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(
       (SELECT COUNT(*)
        FROM chat_mensagens m
        WHERE m.canal_id = cc.id
          AND m.deletada = false
          AND m.usuario_id <> $1
          AND m.criado_em > COALESCE(
            (SELECT ultima_leitura_em FROM chat_leituras WHERE canal_id = cc.id AND usuario_id = $1),
            '-infinity'::timestamptz
          )
       )
    ), 0)::int AS total
    FROM chat_canal_membros cm
    JOIN chat_canais cc ON cc.id = cm.canal_id
    WHERE cm.usuario_id = $1`,
    [usuarioId],
  );
  return Number(rows[0]?.total ?? 0);
}

/** Verifica se o usuário é membro de um canal. */
async function verificarMembro(canalId: number, usuarioId: number): Promise<void> {
  const { rows } = await pool.query(
    `SELECT 1 FROM chat_canal_membros WHERE canal_id = $1 AND usuario_id = $2`,
    [canalId, usuarioId],
  );
  if (!rows[0]) throw new AppError('Acesso negado a este canal.', 403);
}

/** Lista mensagens paginadas de um canal (descriptografadas). */
export async function listarMensagens(
  canalId: number,
  usuarioId: number,
  limite: number = 40,
  antes?: Date,
): Promise<MensagemPublica[]> {
  await verificarMembro(canalId, usuarioId);

  const params: (number | Date)[] = [canalId, limite];
  let cursorClause = '';
  if (antes) {
    params.push(antes);
    cursorClause = `AND m.criado_em < $${params.length}`;
  }

  const { rows } = await pool.query<
    ChatMensagemComAutor
  >(
    `SELECT
       m.id, m.canal_id, m.usuario_id AS autor_id, u.nome AS autor_nome,
       m.conteudo_cifrado, m.iv, m.auth_tag,
       m.anexo_url, m.anexo_nome, m.anexo_mime,
       m.editada, m.deletada, m.criado_em
     FROM chat_mensagens m
     JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.canal_id = $1 AND m.deletada = false ${cursorClause}
     ORDER BY m.criado_em DESC
     LIMIT $2`,
    params,
  );

  return rows.reverse().map((row) => ({
    id: row.id,
    canal_id: row.canal_id,
    autor_id: row.autor_id,
    autor_nome: row.autor_nome,
    conteudo: row.conteudo_cifrado
      ? descriptografar({ conteudo: row.conteudo_cifrado, iv: row.iv!, authTag: row.auth_tag! })
      : null,
    anexo_url: row.anexo_url,
    anexo_nome: row.anexo_nome,
    anexo_mime: row.anexo_mime,
    editada: row.editada,
    deletada: row.deletada,
    criado_em: row.criado_em,
  }));
}

interface ChatMensagemComAutor {
  id: number;
  canal_id: number;
  autor_id: number;
  autor_nome: string;
  conteudo_cifrado: string | null;
  iv: string | null;
  auth_tag: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  editada: boolean;
  deletada: boolean;
  criado_em: Date;
}

interface AnexoPayload {
  url: string;
  nome: string;
  mime: string;
}

/** Envia uma nova mensagem em um canal (criptografa o texto antes de persistir). */
export async function enviarMensagem(
  canalId: number,
  usuarioId: number,
  texto: string | null,
  anexo?: AnexoPayload,
): Promise<MensagemPublica> {
  await verificarMembro(canalId, usuarioId);

  if (!texto && !anexo) {
    throw new AppError('A mensagem deve conter texto ou um anexo.', 400);
  }
  if (texto && texto.length > 4000) {
    throw new AppError('A mensagem não pode ultrapassar 4000 caracteres.', 400);
  }

  let conteudoCifrado: string | null = null;
  let iv: string | null = null;
  let authTag: string | null = null;

  if (texto) {
    const cifrado = criptografar(texto);
    conteudoCifrado = cifrado.conteudo;
    iv = cifrado.iv;
    authTag = cifrado.authTag;
  }

  const { rows } = await pool.query<ChatMensagemComAutor>(
    `WITH ins AS (
       INSERT INTO chat_mensagens (canal_id, usuario_id, conteudo_cifrado, iv, auth_tag, anexo_url, anexo_nome, anexo_mime)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *
     )
     SELECT ins.*, u.nome AS autor_nome
     FROM ins
     JOIN usuarios u ON u.id = ins.usuario_id`,
    [canalId, usuarioId, conteudoCifrado, iv, authTag, anexo?.url ?? null, anexo?.nome ?? null, anexo?.mime ?? null],
  );

  const row = rows[0]!;
  return {
    id: row.id,
    canal_id: row.canal_id,
    autor_id: row.autor_id,
    autor_nome: row.autor_nome,
    conteudo: texto,
    anexo_url: row.anexo_url,
    anexo_nome: row.anexo_nome,
    anexo_mime: row.anexo_mime,
    editada: row.editada,
    deletada: row.deletada,
    criado_em: row.criado_em,
  };
}

/** Edita o texto de uma mensagem (somente o autor). */
export async function editarMensagem(
  mensagemId: number,
  usuarioId: number,
  novoTexto: string,
): Promise<MensagemPublica> {
  if (!novoTexto || novoTexto.trim().length === 0) {
    throw new AppError('O novo texto não pode estar vazio.', 400);
  }

  const { rows: current } = await pool.query<{ usuario_id: number; canal_id: number }>(
    `SELECT usuario_id, canal_id FROM chat_mensagens WHERE id = $1 AND deletada = false`,
    [mensagemId],
  );
  if (!current[0]) throw new AppError('Mensagem não encontrada.', 404);
  if (current[0].usuario_id !== usuarioId) throw new AppError('Sem permissão para editar esta mensagem.', 403);

  const cifrado = criptografar(novoTexto.trim());

  const { rows } = await pool.query<ChatMensagemComAutor>(
    `WITH upd AS (
       UPDATE chat_mensagens
       SET conteudo_cifrado = $1, iv = $2, auth_tag = $3, editada = true, atualizado_em = now()
       WHERE id = $4
       RETURNING *
     )
     SELECT upd.*, u.nome AS autor_nome
     FROM upd
     JOIN usuarios u ON u.id = upd.usuario_id`,
    [cifrado.conteudo, cifrado.iv, cifrado.authTag, mensagemId],
  );

  const row = rows[0]!;
  return {
    id: row.id,
    canal_id: row.canal_id,
    autor_id: row.autor_id,
    autor_nome: row.autor_nome,
    conteudo: novoTexto.trim(),
    anexo_url: row.anexo_url,
    anexo_nome: row.anexo_nome,
    anexo_mime: row.anexo_mime,
    editada: true,
    deletada: false,
    criado_em: row.criado_em,
  };
}

/** Soft-delete de uma mensagem (somente o autor). */
export async function deletarMensagem(mensagemId: number, usuarioId: number): Promise<void> {
  const { rows } = await pool.query<{ usuario_id: number }>(
    `SELECT usuario_id FROM chat_mensagens WHERE id = $1 AND deletada = false`,
    [mensagemId],
  );
  if (!rows[0]) throw new AppError('Mensagem não encontrada.', 404);
  if (rows[0].usuario_id !== usuarioId) throw new AppError('Sem permissão para excluir esta mensagem.', 403);

  await pool.query(
    `UPDATE chat_mensagens SET deletada = true, atualizado_em = now() WHERE id = $1`,
    [mensagemId],
  );
}

/** Atualiza o timestamp de leitura do usuário em um canal. */
export async function marcarLido(canalId: number, usuarioId: number): Promise<void> {
  await pool.query(
    `INSERT INTO chat_leituras (canal_id, usuario_id, ultima_leitura_em)
     VALUES ($1, $2, now())
     ON CONFLICT (canal_id, usuario_id) DO UPDATE SET ultima_leitura_em = now()`,
    [canalId, usuarioId],
  );
}

/**
 * Lista colaboradores para iniciar uma conversa.
 * - Sem `busca` (vazia): retorna todos os usuários ativos, exceto o solicitante.
 * - Com `busca`: filtra por nome ou e-mail (substring, case-insensitive).
 */
export async function buscarUsuariosParaDM(
  busca: string | undefined,
  solicitanteId: number,
): Promise<Array<{ id: number; nome: string; email: string; role: string }>> {
  const termo = busca?.trim() ?? '';

  if (termo === '') {
    const { rows } = await pool.query(
      `SELECT id, nome, email, role
       FROM usuarios
       WHERE id <> $1
         AND bloqueado = false
       ORDER BY nome
       LIMIT 100`,
      [solicitanteId],
    );
    return rows;
  }

  const { rows } = await pool.query(
    `SELECT id, nome, email, role
     FROM usuarios
     WHERE (nome ILIKE $1 OR email ILIKE $1)
       AND id <> $2
       AND bloqueado = false
     ORDER BY nome
     LIMIT 100`,
    [`%${termo}%`, solicitanteId],
  );

  return rows;
}
