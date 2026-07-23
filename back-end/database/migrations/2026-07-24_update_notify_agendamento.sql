-- ============================================================================
-- Migração: agendamento dos avisos (update_notify.publicar_em)
-- Data: 2026-07-24
--
-- Adiciona a coluna `publicar_em`: quando preenchida, o aviso só passa a
-- aparecer para os usuários a partir daquele momento; quando NULL, dispara na
-- criação (comportamento atual). Idempotente. Só rode se a tabela já existe sem
-- a coluna; instalações novas já vêm com ela.
--
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-24_update_notify_agendamento.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.update_notify
  ADD COLUMN IF NOT EXISTS publicar_em TIMESTAMPTZ;

COMMIT;
