-- ============================================================================
-- Migração: módulo de Chamados Gerais de T.I.
-- Data: 2026-06-15
--
-- Cria as tabelas do help desk interno:
--   - chamados             : ticket de suporte (1 anexo opcional na própria linha)
--   - chamado_comentarios  : chat do chamado, com mensagens CIFRADAS (AES-256-GCM)
--
-- Privacidade: o isolamento por usuário é garantido na camada de service
-- (dono ou T.I.); aqui apenas as FKs e índices. Mensagens nunca são salvas em
-- texto puro — só conteudo_cifrado/iv/auth_tag.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-06-15_chamados.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.chamados (
  id            SERIAL        PRIMARY KEY,
  titulo        VARCHAR(200)  NOT NULL,
  descricao     TEXT          NOT NULL,
  categoria     VARCHAR(20)   NOT NULL
                CONSTRAINT chamados_categoria_check
                CHECK (categoria IN ('IMPRESSORA', 'COMPUTADOR', 'REDE', 'ACESSOS', 'OUTROS')),
  criticidade   VARCHAR(10)   NOT NULL
                CONSTRAINT chamados_criticidade_check
                CHECK (criticidade IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
  status        VARCHAR(15)   NOT NULL DEFAULT 'ABERTO'
                CONSTRAINT chamados_status_check
                CHECK (status IN ('ABERTO', 'EM_ANDAMENTO', 'FECHADO')),
  anexo_url     VARCHAR(500),
  anexo_nome    VARCHAR(255),
  anexo_mime    VARCHAR(100),
  usuario_id    INTEGER       NOT NULL REFERENCES blue_intranet.usuarios(id),
  atendente_id  INTEGER       REFERENCES blue_intranet.usuarios(id),
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamados_usuario_id ON blue_intranet.chamados (usuario_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status     ON blue_intranet.chamados (status);
CREATE INDEX IF NOT EXISTS idx_chamados_criado_em  ON blue_intranet.chamados (criado_em DESC);

CREATE TABLE IF NOT EXISTS blue_intranet.chamado_comentarios (
  id                SERIAL       PRIMARY KEY,
  chamado_id        INTEGER      NOT NULL REFERENCES blue_intranet.chamados(id) ON DELETE CASCADE,
  usuario_id        INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  conteudo_cifrado  TEXT         NOT NULL,
  iv                TEXT         NOT NULL,
  auth_tag          TEXT         NOT NULL,
  criado_em         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamado_comentarios_chamado_id
  ON blue_intranet.chamado_comentarios (chamado_id);

COMMIT;
