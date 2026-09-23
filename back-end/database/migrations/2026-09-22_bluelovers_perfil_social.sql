-- ============================================================================
-- Migração: Bluelovers — perfil no formato "rede social" (.docs/bluelovers-visual.md)
-- Data: 2026-09-22
--
-- Migration única da feature: campos do perfil vindos das respostas do
-- formulário, seções 02 (conquistas) e 06 (timeline) em `bluelover_blocos` e
-- títulos personalizáveis dos cards de gostos.
--
-- Idempotente: pode rodar em banco que já recebeu partes dela.
-- Depende de 2026-08-20_bluelovers.sql.
-- ============================================================================

BEGIN;

-- ── Seção 01 — Informações básicas ──────────────────────────────────────────
ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS apelido         VARCHAR(80),
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS bio             VARCHAR(400),
  ADD COLUMN IF NOT EXISTS habilidades     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS talento         VARCHAR(200);

-- No máximo 3 habilidades ("três palavras que te definem").
ALTER TABLE blue_intranet.bluelovers DROP CONSTRAINT IF EXISTS bluelovers_habilidades_check;
ALTER TABLE blue_intranet.bluelovers ADD CONSTRAINT bluelovers_habilidades_check
  CHECK (array_length(habilidades, 1) IS NULL OR array_length(habilidades, 1) <= 3);

-- ── Seção 03 — Gostos & Personalidade ───────────────────────────────────────
-- Cards fixos; `rotulos_gostos` guarda só os títulos personalizados
-- (ex.: {"gosto_comida": "Comida que eu amo"}), o resto usa o padrão do front.
ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS gosto_comida      VARCHAR(120),
  ADD COLUMN IF NOT EXISTS gosto_assiste     VARCHAR(120),
  ADD COLUMN IF NOT EXISTS gosto_musica      VARCHAR(120),
  ADD COLUMN IF NOT EXISTS gosto_cor         VARCHAR(60),
  ADD COLUMN IF NOT EXISTS gosto_rede_social VARCHAR(120),
  ADD COLUMN IF NOT EXISTS gosto_emoji       VARCHAR(16),
  ADD COLUMN IF NOT EXISTS hobby             VARCHAR(120),
  ADD COLUMN IF NOT EXISTS presente_perfeito VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rotulos_gostos    JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Seção 04 — Viagens ──────────────────────────────────────────────────────
ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS viagem_favorita_texto    VARCHAR(400),
  ADD COLUMN IF NOT EXISTS viagem_favorita_foto_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS viagem_sonho             VARCHAR(120),
  ADD COLUMN IF NOT EXISTS viagem_sonho_foto_url    VARCHAR(500);

-- ── Seção 05 — Inspirações ──────────────────────────────────────────────────
ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS inspiracao_texto    VARCHAR(400),
  ADD COLUMN IF NOT EXISTS inspiracao_foto_url VARCHAR(500);

-- ── Seção 07 — Bluepay como pessoa ──────────────────────────────────────────
ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS bluepay_pessoa_texto    VARCHAR(400),
  ADD COLUMN IF NOT EXISTS bluepay_pessoa_foto_url VARCHAR(500);

-- ── Seção 09 — Encerramento ─────────────────────────────────────────────────
ALTER TABLE blue_intranet.bluelovers
  ADD COLUMN IF NOT EXISTS mais_sobre_mim VARCHAR(600);

-- ── Seções 02 (conquistas) e 06 (timeline) ──────────────────────────────────
-- `livre` preserva os blocos criados no formato antigo do perfil.
ALTER TABLE blue_intranet.bluelover_blocos
  ADD COLUMN IF NOT EXISTS tipo        VARCHAR(20) NOT NULL DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS chave       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS rotulo_data VARCHAR(30);

ALTER TABLE blue_intranet.bluelover_blocos DROP CONSTRAINT IF EXISTS bluelover_blocos_tipo_check;
ALTER TABLE blue_intranet.bluelover_blocos ADD CONSTRAINT bluelover_blocos_tipo_check
  CHECK (tipo IN ('conquista', 'momento', 'livre'));

-- Os 4 cards da seção 02 são identificados pela chave e não se repetem no perfil.
ALTER TABLE blue_intranet.bluelover_blocos DROP CONSTRAINT IF EXISTS bluelover_blocos_chave_check;
ALTER TABLE blue_intranet.bluelover_blocos ADD CONSTRAINT bluelover_blocos_chave_check
  CHECK (
    (tipo = 'conquista' AND chave IN ('realizacao_pessoal', 'realizacao_profissional', 'sonho', 'desenvolver'))
    OR (tipo <> 'conquista' AND chave IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_bluelover_blocos_conquista
  ON blue_intranet.bluelover_blocos (bluelover_id, chave)
  WHERE tipo = 'conquista';

CREATE INDEX IF NOT EXISTS idx_bluelover_blocos_tipo
  ON blue_intranet.bluelover_blocos (bluelover_id, tipo, ordem);

COMMIT;
