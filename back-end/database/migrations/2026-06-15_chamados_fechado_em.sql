-- ============================================================================
-- Migração: data de fechamento dos chamados
-- Data: 2026-06-15
--
-- Adiciona `fechado_em` à tabela chamados para medir com precisão o tempo de
-- resolução (do ABERTO até o FECHADO), usado no painel de métricas da T.I.
-- É preenchida quando o status vira FECHADO e zerada se o chamado for reaberto.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-06-15_chamados_fechado_em.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.chamados
  ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ;

COMMIT;
