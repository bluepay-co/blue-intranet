-- ============================================================================
-- Migração: Kanban — participantes da tarefa
-- Data: 2026-09-28
--
-- Pessoas extras (de qualquer equipe com Kanban) que acompanham a tarefa além
-- do responsável e do solicitante: veem, comentam, cobram e são notificadas.
-- Não movem nem editam (isso segue com responsável, criador e coordenação).
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-28_kanban_participantes.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.kanban_participantes (
  tarefa_id      INTEGER     NOT NULL REFERENCES blue_intranet.kanban_tarefas(id) ON DELETE CASCADE,
  usuario_id     INTEGER     NOT NULL REFERENCES blue_intranet.usuarios(id),
  adicionado_por INTEGER     NOT NULL REFERENCES blue_intranet.usuarios(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tarefa_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_kanban_participantes_usuario ON blue_intranet.kanban_participantes (usuario_id);

COMMIT;
