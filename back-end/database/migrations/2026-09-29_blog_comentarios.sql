-- ============================================================================
-- Migração: Blog — comentários nos posts
-- Data: 2026-09-29
--
-- Qualquer usuário autenticado comenta em posts publicados. O autor apaga o
-- próprio comentário e o Marketing (e Desenvolvedor) apaga qualquer um para
-- moderar; não há edição. Texto puro: os posts e comentários são visíveis para
-- a empresa inteira, então cifrar não protege de quem já lê pelo feed.
-- O CASCADE remove os comentários junto com o post ou com o usuário.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-09-29_blog_comentarios.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.blog_comentarios (
  id          SERIAL        PRIMARY KEY,
  post_id     INTEGER       NOT NULL REFERENCES blue_intranet.blog_posts(id) ON DELETE CASCADE,
  usuario_id  INTEGER       NOT NULL REFERENCES blue_intranet.usuarios(id) ON DELETE CASCADE,
  texto       VARCHAR(1000) NOT NULL,
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_comentarios_post ON blue_intranet.blog_comentarios (post_id, criado_em);

COMMIT;
