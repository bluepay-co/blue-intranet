-- ============================================================================
-- Migração: Bluelovers — card de gosto "personagem" (com imagem)
-- Data: 2026-09-29
--
-- "Qual personagem de filme, série ou desenho você se identifica?" entra na
-- seção de gostos. É o único card de gosto com imagem: a foto ocupa o lugar do
-- emoji. O título continua personalizável via `rotulos_gostos` (chave
-- `personagem`), como os demais gostos.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-29_bluelovers_personagem.sql
-- ============================================================================

BEGIN;

ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS personagem          VARCHAR(120),
  ADD COLUMN IF NOT EXISTS personagem_foto_url VARCHAR(500);

COMMIT;
