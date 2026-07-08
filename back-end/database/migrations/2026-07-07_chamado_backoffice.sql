-- ============================================================================
-- Migração: mapeamento dos chamados de infra criados no BluePay Backoffice
-- Data: 2026-07-07
--
-- Os chamados de infra passam a viver no backoffice externo (área 7). Como todos
-- são criados com o MESMO token (mesmo requester lá), guardamos aqui QUEM da
-- intranet abriu cada ticket — para o escopo "meus chamados" por usuário — além
-- da categoria/patrimônio (que não têm campo próprio no backoffice; vão só na
-- descrição). O backoffice continua sendo a fonte de verdade dos dados do ticket.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-07-07_chamado_backoffice.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.chamado_backoffice (
  id          SERIAL       PRIMARY KEY,
  ticket_id   INTEGER      NOT NULL UNIQUE,          -- id do ticket no backoffice
  usuario_id  INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  categoria   VARCHAR(20)  NOT NULL DEFAULT 'OUTROS',
  patrimonio  VARCHAR(120),
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamado_backoffice_usuario
  ON blue_intranet.chamado_backoffice (usuario_id);

COMMIT;
