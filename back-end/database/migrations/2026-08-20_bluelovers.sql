-- ============================================================================
-- Migração: Bluelovers — perfis do time mantidos pelo Marketing
-- Data: 2026-08-20
--
-- Traz para a intranet o "Nosso Time" que hoje vive num Google Sites estático.
-- Cada Bluelover é um cadastro INDEPENDENTE (não referencia `usuarios`): o
-- Marketing digita nome/cargo, então o perfil não quebra se a pessoa não tiver
-- login ou for desativada. `criado_por` guarda apenas quem publicou.
--
-- O conteúdo do perfil é um "mini jornal" de seções livres ("Eu amo, eu adoro",
-- "Meus sonhos"), por isso os blocos vivem em tabela filha e não em JSONB: cada
-- bloco carrega uma foto real em disco cujo path precisa ser recuperável
-- isoladamente para o fs.unlink ao editar/remover. O CASCADE garante que apagar
-- um perfil leva junto seus blocos.
--
-- Execução: docker compose exec -T db psql -U postgres -d postgres < 2026-08-20_bluelovers.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS blue_intranet.bluelovers (
  id                SERIAL       PRIMARY KEY,
  nome              VARCHAR(150) NOT NULL,
  cargo             VARCHAR(120),
  setor             VARCHAR(120),
  frase             VARCHAR(300),           -- chamada exibida no card ("Eu amo, eu adoro…")
  foto_capa_url     VARCHAR(500) NOT NULL,  -- 1080x1350 (4:5), vinda do template do Photoshop
  foto_destaque_url VARCHAR(500),           -- imagem grande do topo da página de perfil
  ordem             INTEGER      NOT NULL DEFAULT 0,
  publicado         BOOLEAN      NOT NULL DEFAULT false,
  criado_por        INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id) ON DELETE RESTRICT,
  criado_em         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Casa com a listagem pública: WHERE publicado = true ORDER BY ordem, nome.
CREATE INDEX IF NOT EXISTS idx_bluelovers_listagem
  ON blue_intranet.bluelovers (publicado, ordem, nome);

CREATE TABLE IF NOT EXISTS blue_intranet.bluelover_blocos (
  id           SERIAL       PRIMARY KEY,
  bluelover_id INTEGER      NOT NULL REFERENCES blue_intranet.bluelovers(id) ON DELETE CASCADE,
  titulo       VARCHAR(150) NOT NULL,
  texto        TEXT         NOT NULL,
  foto_url     VARCHAR(500),               -- foto pequena ao lado do texto (opcional)
  ordem        INTEGER      NOT NULL DEFAULT 0,
  criado_em    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bluelover_blocos_perfil
  ON blue_intranet.bluelover_blocos (bluelover_id, ordem);

COMMIT;
