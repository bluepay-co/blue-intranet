-- ============================================================================
--  Habilita pg_stat_statements no banco local da intranet.
--  Executar UMA VEZ após o primeiro deploy com o stack de monitoramento.
--
--  Como rodar (na VM):
--    docker compose exec db psql -U postgres -d postgres -f /tmp/init.sql
--
--  Ou copie e cole no psql:
--    docker compose exec db psql -U postgres -d postgres
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Confirma que foi criada
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';
