-- ============================================================================
-- Migração: Kanban — aviso de tarefa esquecida (parada há dias)
-- Data: 2026-09-29
--
-- O job do servidor (socket/lembretes-kanban.ts) avisa responsável e solicitante
-- quando uma tarefa aberta fica sem atualização. `esquecida_avisada_em` evita
-- repetir o aviso: ele só volta a disparar se a tarefa for atualizada depois
-- (atualizado_em > esquecida_avisada_em) e parar de novo.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-29_kanban_aviso_esquecida.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.kanban_tarefas
  ADD COLUMN IF NOT EXISTS esquecida_avisada_em TIMESTAMPTZ;

ALTER TABLE blue_intranet.kanban_notificacoes DROP CONSTRAINT IF EXISTS kanban_notificacoes_tipo_check;
ALTER TABLE blue_intranet.kanban_notificacoes ADD CONSTRAINT kanban_notificacoes_tipo_check
  CHECK (tipo IN ('solicitacao', 'comentario', 'cobranca', 'status', 'lembrete', 'vencido', 'esquecida'));

COMMIT;
