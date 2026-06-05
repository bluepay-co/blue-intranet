-- ============================================================================
-- Banco: intranet_dev  |  Tabela: usuarios
-- Autenticação Google Workspace (OAuth2) + Controle de Cargos (RBAC)
--
-- ISOLAMENTO: o servidor PostgreSQL é compartilhado com outros projetos.
-- O isolamento é garantido pelo banco dedicado `intranet_dev`. Evitamos criar
-- TYPE ENUM global; o cargo é validado por CHECK constraint local à tabela.
--
-- Execução: psql -h localhost -U dev_intranet -d intranet_dev -f usuarios.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id                    SERIAL       PRIMARY KEY,
  nome                  VARCHAR(150) NOT NULL,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  role                  VARCHAR(20)  NOT NULL DEFAULT 'COLABORADOR'
                        CHECK (role IN ('TI', 'RH', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR')),
  google_access_token   TEXT,
  google_refresh_token  TEXT,
  criado_em             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Busca por e-mail é o caminho quente do login.
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
