-- ============================================================================
-- Migração: cargo de coordenação — Gerente Pré-vendas
-- Data: 2026-09-28
--
-- Amplia o CHECK de `usuarios.role` para incluir 'GERENTE_PRE_VENDAS' —
-- coordena a equipe de Pré-vendas e Vendas (mesmo time). No front o cargo é
-- exibido como "Coordenador Pré-vendas".
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-28_gerente_pre_vendas.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE blue_intranet.usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN (
    'TI', 'DESENVOLVEDOR', 'MARKETING', 'INSIGHT_SALES', 'KAM', 'RH',
    'VENDAS', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR', 'CX', 'PRODUTOS',
    'PRE_VENDAS', 'GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'GERENTE_PRE_VENDAS'
  ));

COMMIT;
