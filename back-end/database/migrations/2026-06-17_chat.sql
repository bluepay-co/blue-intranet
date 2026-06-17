BEGIN;

-- ─── Canais (privado 1:1, setor, customizado) ────────────────────────────────
CREATE TABLE IF NOT EXISTS blue_intranet.chat_canais (
  id         SERIAL       PRIMARY KEY,
  tipo       VARCHAR(15)  NOT NULL
             CONSTRAINT chat_canais_tipo_check
             CHECK (tipo IN ('PRIVADO', 'SETOR', 'CUSTOMIZADO')),
  nome       VARCHAR(100),
  criado_por INTEGER      REFERENCES blue_intranet.usuarios(id),
  criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Evita canal SETOR/CUSTOMIZADO duplicado por nome
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_canais_tipo_nome
  ON blue_intranet.chat_canais (tipo, nome)
  WHERE tipo IN ('SETOR', 'CUSTOMIZADO');

CREATE INDEX IF NOT EXISTS idx_chat_canais_tipo
  ON blue_intranet.chat_canais (tipo);

-- ─── Membros dos canais ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blue_intranet.chat_canal_membros (
  canal_id   INTEGER NOT NULL REFERENCES blue_intranet.chat_canais(id)  ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES blue_intranet.usuarios(id)     ON DELETE CASCADE,
  entrou_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (canal_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_membros_usuario
  ON blue_intranet.chat_canal_membros (usuario_id);

-- ─── Mensagens (conteúdo cifrado AES-256-GCM) ────────────────────────────────
CREATE TABLE IF NOT EXISTS blue_intranet.chat_mensagens (
  id               SERIAL       PRIMARY KEY,
  canal_id         INTEGER      NOT NULL REFERENCES blue_intranet.chat_canais(id) ON DELETE CASCADE,
  usuario_id       INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  conteudo_cifrado TEXT,
  iv               TEXT,
  auth_tag         TEXT,
  anexo_url        VARCHAR(500),
  anexo_nome       VARCHAR(255),
  anexo_mime       VARCHAR(100),
  editada          BOOLEAN      NOT NULL DEFAULT false,
  deletada         BOOLEAN      NOT NULL DEFAULT false,
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msgs_canal
  ON blue_intranet.chat_mensagens (canal_id, criado_em DESC);

-- ─── Rastreamento de leitura por usuário/canal ───────────────────────────────
CREATE TABLE IF NOT EXISTS blue_intranet.chat_leituras (
  canal_id          INTEGER NOT NULL REFERENCES blue_intranet.chat_canais(id) ON DELETE CASCADE,
  usuario_id        INTEGER NOT NULL REFERENCES blue_intranet.usuarios(id)    ON DELETE CASCADE,
  ultima_leitura_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (canal_id, usuario_id)
);

COMMIT;
