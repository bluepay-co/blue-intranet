-- Adiciona coluna setor para identificar a origem do chamado (TI, CX, etc.)
-- independente da role atual do usuário que abriu.
ALTER TABLE chamados
  ADD COLUMN IF NOT EXISTS setor VARCHAR(20) NOT NULL DEFAULT 'TI';
