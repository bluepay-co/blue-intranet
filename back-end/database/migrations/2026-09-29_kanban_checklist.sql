-- ============================================================================
-- Migração: Kanban — checklist dentro da tarefa
-- Data: 2026-09-29
--
-- Subitens marcáveis para quebrar uma tarefa grande sem criar várias tarefas.
-- Quem pode mexer segue as permissões da tarefa (responsável, criador e
-- coordenação); os demais só visualizam. O CASCADE apaga os itens com a tarefa.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-29_kanban_checklist.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.kanban_checklist (
  id             SERIAL       PRIMARY KEY,
  tarefa_id      INTEGER      NOT NULL REFERENCES blue_intranet.kanban_tarefas(id) ON DELETE CASCADE,
  texto          VARCHAR(300) NOT NULL,
  concluido      BOOLEAN      NOT NULL DEFAULT false,
  ordem          INTEGER      NOT NULL DEFAULT 0,
  criado_por     INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  concluido_por  INTEGER      REFERENCES blue_intranet.usuarios(id),
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  concluido_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kanban_checklist_tarefa ON blue_intranet.kanban_checklist (tarefa_id);

COMMIT;
