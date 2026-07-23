-- ============================================================================
-- Migração: cargo de gerência — Gerente Inside Sales & CX
-- Data: 2026-07-22
--
-- Amplia o CHECK de `usuarios.role` para incluir 'GERENTE_INSIDE_CX' — gerente
-- do time Inside Sales (INSIGHT_SALES), que também vai futuramente gerenciar
-- CX (Customer Experience, ainda sem métricas implementadas).
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-22_gerente_inside_cx.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE blue_intranet.usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN (
    'TI', 'DESENVOLVEDOR', 'MARKETING', 'INSIGHT_SALES', 'KAM', 'RH',
    'VENDAS', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR', 'CX', 'PRODUTOS',
    'PRE_VENDAS', 'GERENTE_INSIDE_CX'
  ));

COMMIT;
