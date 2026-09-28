-- ============================================================================
-- Migração: Kanban de Tarefas por equipe
-- Data: 2026-09-28
--
-- Tarefas com solicitante -> responsável, prioridade, prazo, lembrete e
-- visibilidade (private | requester | team). As colunas "Atrasado" e
-- "Esquecido" do quadro são calculadas (prazo / atualizado_em), por isso o
-- status guarda apenas todo | doing | done.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-28_kanban_tarefas.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.kanban_tarefas (
  id                     SERIAL       PRIMARY KEY,
  titulo                 VARCHAR(200) NOT NULL,
  descricao              TEXT         NOT NULL DEFAULT '',
  responsavel_id         INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  solicitante_id         INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  criador_id             INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  area_solicitante       VARCHAR(60)  NOT NULL,
  prioridade             VARCHAR(10)  NOT NULL DEFAULT 'normal'
                           CHECK (prioridade IN ('urgent', 'high', 'normal', 'low')),
  status                 VARCHAR(10)  NOT NULL DEFAULT 'todo'
                           CHECK (status IN ('todo', 'doing', 'done')),
  visibilidade           VARCHAR(10)  NOT NULL DEFAULT 'private'
                           CHECK (visibilidade IN ('private', 'requester', 'team')),
  prazo                  TIMESTAMPTZ  NOT NULL,
  lembrete_min           INTEGER      NOT NULL DEFAULT 0,
  lembrete_em            TIMESTAMPTZ,
  lembrete_enviado       BOOLEAN      NOT NULL DEFAULT false,
  vencimento_notificado  BOOLEAN      NOT NULL DEFAULT false,
  ordem                  INTEGER      NOT NULL DEFAULT 0,
  criado_em              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  concluido_em           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kanban_tarefas_responsavel ON blue_intranet.kanban_tarefas (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tarefas_solicitante ON blue_intranet.kanban_tarefas (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tarefas_prazo       ON blue_intranet.kanban_tarefas (prazo);

CREATE TABLE IF NOT EXISTS blue_intranet.kanban_historico (
  id          SERIAL      PRIMARY KEY,
  tarefa_id   INTEGER     NOT NULL REFERENCES blue_intranet.kanban_tarefas(id) ON DELETE CASCADE,
  usuario_id  INTEGER     NOT NULL REFERENCES blue_intranet.usuarios(id),
  tipo        VARCHAR(12) NOT NULL CHECK (tipo IN ('evento', 'comentario')),
  texto       TEXT        NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_historico_tarefa ON blue_intranet.kanban_historico (tarefa_id);

CREATE TABLE IF NOT EXISTS blue_intranet.kanban_notificacoes (
  id               SERIAL      PRIMARY KEY,
  destinatario_id  INTEGER     NOT NULL REFERENCES blue_intranet.usuarios(id),
  tarefa_id        INTEGER     NOT NULL REFERENCES blue_intranet.kanban_tarefas(id) ON DELETE CASCADE,
  tipo             VARCHAR(12) NOT NULL
                     CHECK (tipo IN ('solicitacao', 'comentario', 'cobranca', 'status', 'lembrete', 'vencido')),
  texto            TEXT        NOT NULL,
  lida             BOOLEAN     NOT NULL DEFAULT false,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_notificacoes_pendentes
  ON blue_intranet.kanban_notificacoes (destinatario_id) WHERE lida = false;

COMMIT;
