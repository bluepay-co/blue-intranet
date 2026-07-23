-- ============================================================================
-- Migração: categoria dos avisos de atualização (update_notify.categoria)
-- Data: 2026-07-24
--
-- Adiciona a coluna `categoria` aos avisos (Atualização, Aviso, Novidade,
-- Manutenção…). O front usa a categoria para escolher o ícone/cor do card.
-- Idempotente (ADD COLUMN IF NOT EXISTS) — só rode isto se a tabela
-- `update_notify` já foi criada SEM a coluna; instalações novas já vêm com ela.
--
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-24_update_notify_categoria.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.update_notify
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) NOT NULL DEFAULT 'ATUALIZACAO';

COMMIT;
