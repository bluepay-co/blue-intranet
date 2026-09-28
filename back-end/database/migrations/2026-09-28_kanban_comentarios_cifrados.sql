-- ============================================================================
-- Migração: Kanban — comentários cifrados (AES-256-GCM)
-- Data: 2026-09-28
--
-- Comentários passam a ser gravados só como cifra (conteudo_cifrado/iv/auth_tag),
-- no mesmo padrão de chamado_comentarios. `texto` fica NULL nos comentários e
-- segue em claro apenas nos eventos gerados pelo sistema ("iniciou a tarefa"...).
-- Comentários antigos em texto puro continuam legíveis (fallback no service).
--
-- Requer KANBAN_ENCRYPTION_KEY (64 hex) no .env do back-end.
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-28_kanban_comentarios_cifrados.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.kanban_historico
  ADD COLUMN IF NOT EXISTS conteudo_cifrado TEXT,
  ADD COLUMN IF NOT EXISTS iv               TEXT,
  ADD COLUMN IF NOT EXISTS auth_tag         TEXT;

ALTER TABLE blue_intranet.kanban_historico ALTER COLUMN texto DROP NOT NULL;

ALTER TABLE blue_intranet.kanban_historico DROP CONSTRAINT IF EXISTS kanban_historico_conteudo_check;
ALTER TABLE blue_intranet.kanban_historico ADD CONSTRAINT kanban_historico_conteudo_check
  CHECK (texto IS NOT NULL OR (conteudo_cifrado IS NOT NULL AND iv IS NOT NULL AND auth_tag IS NOT NULL));

COMMIT;
