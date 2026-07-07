-- ============================================================================
-- Migração: setor de Pré-Vendas (SDRs) — métricas de atividade próprias
-- Data: 2026-07-03
--
-- 1) Amplia o CHECK de `usuarios.role` para incluir 'PRE_VENDAS'.
-- 2) Cria as tabelas de atividade das SDRs (fonte de dados própria da intranet;
--    NÃO vem do banco de produção, pois são reuniões/ligações, não receita):
--      - pv_reuniao        : log de reuniões (agendada/realizada/qualificada)
--      - pv_ligacao_semana : total de ligações por SDR por semana
--
-- Ajuste o schema conforme seu ambiente (aqui: blue_intranet).
-- Execução: psql -h localhost -U postgres -d postgres -f 2026-07-03_prevendas.sql
-- ============================================================================

BEGIN;

-- 1) Cargo PRE_VENDAS ---------------------------------------------------------
ALTER TABLE blue_intranet.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE blue_intranet.usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN (
    'TI', 'DESENVOLVEDOR', 'MARKETING', 'INSIGHT_SALES', 'KAM', 'RH',
    'VENDAS', 'FINANCEIRO', 'DIRETORIA', 'COLABORADOR', 'CX', 'PRODUTOS',
    'PRE_VENDAS'
  ));

-- 2) Log de reuniões ----------------------------------------------------------
-- Cada linha = uma reunião registrada pela SDR. Os KPIs de Agendadas/Realizadas/
-- Qualificadas saem de COUNT sobre esta tabela; também habilita os insights de
-- distribuição por vendedor (IS/KAM) e por segmento.
CREATE TABLE IF NOT EXISTS blue_intranet.pv_reuniao (
  id            SERIAL       PRIMARY KEY,
  sdr_id        INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  empresa       VARCHAR(200) NOT NULL,
  vendedor_nome VARCHAR(150),
  segmento      VARCHAR(120),
  ano           SMALLINT     NOT NULL,
  mes           SMALLINT     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  semana        SMALLINT     NOT NULL CHECK (semana BETWEEN 1 AND 6),
  status        VARCHAR(12)  NOT NULL
                CONSTRAINT pv_reuniao_status_check
                CHECK (status IN ('AGENDADA', 'REALIZADA', 'QUALIFICADA')),
  criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pv_reuniao_sdr_periodo
  ON blue_intranet.pv_reuniao (sdr_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_pv_reuniao_periodo
  ON blue_intranet.pv_reuniao (ano, mes);

-- 3) Ligações por semana ------------------------------------------------------
-- Total de ligações efetuadas por SDR numa semana (upsert por período).
CREATE TABLE IF NOT EXISTS blue_intranet.pv_ligacao_semana (
  id            SERIAL       PRIMARY KEY,
  sdr_id        INTEGER      NOT NULL REFERENCES blue_intranet.usuarios(id),
  ano           SMALLINT     NOT NULL,
  mes           SMALLINT     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  semana        SMALLINT     NOT NULL CHECK (semana BETWEEN 1 AND 6),
  quantidade    INTEGER      NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pv_ligacao_semana_unica UNIQUE (sdr_id, ano, mes, semana)
);

CREATE INDEX IF NOT EXISTS idx_pv_ligacao_sdr_periodo
  ON blue_intranet.pv_ligacao_semana (sdr_id, ano, mes);

COMMIT;
