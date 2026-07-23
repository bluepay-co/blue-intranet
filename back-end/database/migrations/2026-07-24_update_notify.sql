-- ============================================================================
-- Migração: avisos de atualização da intranet (update_notify)
-- Data: 2026-07-24
--
-- Tabela que guarda os avisos de atualização criados pelo T.I. Cada aviso vira
-- um card modal exibido para todos os usuários (quem está online, via polling,
-- e quem logar depois). Só título + subtítulo; o "já visto" é controlado por
-- usuário no localStorage do front, então não há tabela de leitura aqui.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-24_update_notify.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.update_notify (
  id            SERIAL       PRIMARY KEY,
  titulo        VARCHAR(120) NOT NULL,
  subtitulo     TEXT,
  categoria     VARCHAR(20)  NOT NULL DEFAULT 'ATUALIZACAO',
  publicar_em   TIMESTAMPTZ,
  criado_por    INTEGER      REFERENCES blue_intranet.usuarios(id),
  criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_update_notify_criado_em
  ON blue_intranet.update_notify (criado_em DESC);

COMMIT;
