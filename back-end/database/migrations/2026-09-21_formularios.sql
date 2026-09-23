-- ============================================================================
-- Migração: Formulários do Marketing (Google Forms API)
-- Data: 2026-09-21
--
-- `formularios` guarda só a referência ao Google Form; perguntas e respostas
-- vivem no Google. As chamadas à API usam o token de `criado_por`.
-- `usuarios.google_forms_conectado` marca quem autorizou os scopes do Forms.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.usuarios
  ADD COLUMN IF NOT EXISTS google_forms_conectado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS blue_intranet.formularios (
  id              SERIAL PRIMARY KEY,
  google_form_id  VARCHAR(128) NOT NULL UNIQUE,
  titulo          VARCHAR(300) NOT NULL,
  responder_uri   TEXT         NOT NULL,
  criado_por      INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formularios_criado_em ON blue_intranet.formularios (criado_em DESC);

COMMIT;
