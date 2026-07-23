-- ============================================================================
-- Migração: cargo de gerência — Gerente Comercial
-- Data: 2026-07-23
--
-- Amplia o CHECK de `usuarios.role` para incluir 'GERENTE_COMERCIAL' — gerente
-- comercial que enxerga os times Inside Sales (INSIGHT_SALES) e KAM. Como não
-- existe um gerente exclusivo de KAM, é o Gerente Comercial quem cobre os dois
-- times, com a mesma interface do Gerente Inside Sales, porém por time.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-23_gerente_comercial.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE blue_intranet.usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN (
    'TI', 'DESENVOLVEDOR', 'MARKETING', 'INSIGHT_SALES', 'KAM', 'RH',
    'VENDAS', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR', 'CX', 'PRODUTOS',
    'PRE_VENDAS', 'GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL'
  ));

COMMIT;
