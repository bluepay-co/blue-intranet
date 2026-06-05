-- ============================================================================
-- Migração: amplia os cargos (role) aceitos pela tabela usuarios
-- Data: 2026-06-05
--
-- Alinha o CHECK da coluna `role` ao enum Role de models/usuario.model.ts,
-- incluindo: MARKETING, INSIGHT_SALES, KAM, VENDAS.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-06-05_amplia_roles.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE blue_intranet.usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN (
    'TI', 'MARKETING', 'INSIGHT_SALES', 'KAM', 'RH',
    'VENDAS', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR'
  ));

COMMIT;
