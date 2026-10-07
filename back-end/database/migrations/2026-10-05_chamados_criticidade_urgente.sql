-- Acrescenta URGENTE ao CHECK de criticidade dos chamados.
-- O enum CriticidadeChamado (models/chamado.model.ts) e a lista CRITICIDADES
-- do front já têm o nível; sem isto o INSERT estoura na constraint.
SET search_path TO blue_intranet;

ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_criticidade_check;

ALTER TABLE chamados
  ADD CONSTRAINT chamados_criticidade_check
  CHECK (criticidade IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO', 'URGENTE'));
