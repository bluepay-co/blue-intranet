-- ============================================================================
-- Migração: bloqueio de acesso + alinhamento do CHECK de role
-- Data: 2026-06-15
--
-- 1. Adiciona a coluna `bloqueado` (controle de acesso pela T.I): quando true,
--    o usuário não consegue logar nem restaurar a sessão, mesmo com e-mail
--    corporativo válido.
-- 2. Realinha o CHECK da coluna `role` ao enum Role de models/usuario.model.ts,
--    incluindo o cargo `DESENVOLVEDOR` que faltava.
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-06-15_usuarios_bloqueio.sql
-- ============================================================================

BEGIN;

-- 1. Coluna de bloqueio (default: liberado)
ALTER TABLE blue_intranet.usuarios
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false;

-- 2. CHECK de role alinhado ao enum Role (inclui DESENVOLVEDOR)
ALTER TABLE blue_intranet.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE blue_intranet.usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN (
    'TI', 'DESENVOLVEDOR', 'MARKETING', 'INSIGHT_SALES', 'KAM', 'RH',
    'VENDAS', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR'
  ));

COMMIT;
