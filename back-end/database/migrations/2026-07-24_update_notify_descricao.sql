-- ============================================================================
-- Migração: descrição multilinha nos avisos (update_notify.subtitulo -> TEXT)
-- Data: 2026-07-24
--
-- A descrição do aviso passou a ser obrigatória e multilinha (lista de itens),
-- então a coluna deixa de ser VARCHAR(255) e vira TEXT. Conversão sem perda de
-- dados. Só rode isto se a tabela já foi criada com `subtitulo VARCHAR(255)`;
-- instalações novas já vêm com TEXT.
--
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-24_update_notify_descricao.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.update_notify
  ALTER COLUMN subtitulo TYPE TEXT;

COMMIT;
