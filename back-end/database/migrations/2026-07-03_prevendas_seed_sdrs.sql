-- ============================================================================
-- Seed: atribui o cargo PRE_VENDAS às SDRs de Pré-Vendas
-- Data: 2026-07-03
--
-- Rodar DEPOIS de 2026-07-03_prevendas.sql (que libera 'PRE_VENDAS' no CHECK).
-- O login (auth.service) faz upsert por e-mail e NÃO sobrescreve o cargo, então:
--   - se a SDR ainda não logou, ela nasce já como PRE_VENDAS aqui;
--   - se já existe (ex.: COLABORADOR), o UPDATE corrige o cargo.
-- O `nome` é ajustado pelo Google no primeiro login (aqui é só um placeholder).
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres \
--             < back-end/database/migrations/2026-07-03_prevendas_seed_sdrs.sql
-- ============================================================================

BEGIN;

INSERT INTO blue_intranet.usuarios (nome, email, role)
VALUES
  ('Ana Andrade',        'anaandrade@bluepaysolutions.com.br',        'PRE_VENDAS'),
  ('Laura Chaves',       'laurachaves@bluepaysolutions.com.br',       'PRE_VENDAS'),
  ('Rayssa Araujo',      'rayssaaraujo@bluepaysolutions.com.br',      'PRE_VENDAS'),
  ('Nathaly Cavalcante', 'nathalycavalcante@bluepaysolutions.com.br', 'PRE_VENDAS')
ON CONFLICT (email) DO UPDATE
  SET role = 'PRE_VENDAS',
      atualizado_em = now();

COMMIT;
