-- Amplia as categorias de chamados para suportar o fluxo CX → Produtos
-- e adiciona o campo identificador_url para links externos.

ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_categoria_check;

ALTER TABLE chamados
  ADD CONSTRAINT chamados_categoria_check
  CHECK (categoria IN (
    'IMPRESSORA', 'COMPUTADOR', 'REDE', 'ACESSOS', 'OUTROS',
    'BUG', 'MELHORIA', 'DUVIDA', 'INTEGRACAO'
  ));

ALTER TABLE chamados
  ADD COLUMN IF NOT EXISTS identificador_url VARCHAR(500);
