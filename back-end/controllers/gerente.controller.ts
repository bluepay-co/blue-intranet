import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { pool } from '../database/pool';
import {
  listarMembrosEquipeGerente,
  listarClientesEquipeGerente,
  buscarClienteEquipeGerente,
  buscarReceitasEquipeGerente,
  buscarRankingPeriodoGerente,
  buscarPessoalEquipeGerente,
  type EquipeGerente,
} from '../services/gerente.service';

/** Times (IS|KAM) que cada cargo de gerência pode acessar. */
const TIMES_POR_ROLE: Record<string, EquipeGerente[]> = {
  GERENTE_INSIDE_CX: ['IS'],
  GERENTE_COMERCIAL: ['IS', 'KAM'],
  DESENVOLVEDOR: ['IS', 'KAM'],
};

/**
 * Resolve o time (IS|KAM) que a requisição quer acessar e valida contra os
 * times permitidos para a role de quem chama — lida do banco (não do JWT) para
 * não depender de token desatualizado, já que aqui o param dá acesso a dados de
 * outro time. Default é o primeiro time permitido da role quando `?equipe=` é
 * omitido (mantém as telas atuais do GERENTE_INSIDE_CX compatíveis). Fora do
 * escopo → 403.
 */
async function resolverEquipeParam(req: Request): Promise<EquipeGerente> {
  const userId = req.usuario?.id;
  if (!userId) throw new AppError('Usuário não autenticado.', 401);

  const { rows } = await pool.query(
    `SELECT role FROM blue_intranet.usuarios WHERE id = $1 AND bloqueado = false`,
    [userId],
  );
  if (!rows[0]) throw new AppError('Usuário não encontrado ou bloqueado.', 403);
  const role: string = rows[0].role;
  const permitidos = TIMES_POR_ROLE[role] ?? [];

  const solicitado = req.query.equipe as string | undefined;
  if (solicitado === undefined) {
    const padrao = permitidos[0];
    if (!padrao) throw new AppError('Seu cargo não tem acesso a nenhuma equipe.', 403);
    return padrao;
  }
  if (solicitado !== 'IS' && solicitado !== 'KAM') {
    throw new AppError('Equipe inválida.', 400);
  }
  if (!permitidos.includes(solicitado)) {
    throw new AppError('Seu cargo não tem acesso a esta equipe.', 403);
  }
  return solicitado;
}

function paramTexto(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/** Lê `vendedorId` da query — undefined se ausente, 400 se presente e inválido. */
function paramVendedorId(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('vendedorId inválido.', 400);
  return id;
}

export async function getMembrosEquipe(req: Request, res: Response) {
  try {
    const equipe = await resolverEquipeParam(req);
    const membros = await listarMembrosEquipeGerente(equipe);
    return res.status(200).json({ membros });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getMembrosEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar membros da equipe.' });
  }
}

export async function getClientesEquipe(req: Request, res: Response) {
  try {
    const equipe = await resolverEquipeParam(req);
    const vendedorId = paramVendedorId(req.query.vendedorId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const resultado = await listarClientesEquipeGerente(equipe, vendedorId, {
      busca: paramTexto(req.query.busca),
      uf: paramTexto(req.query.uf),
      cidade: paramTexto(req.query.cidade),
      segmento: paramTexto(req.query.segmento),
      status: paramTexto(req.query.status),
      page,
      limit,
    });
    if (!resultado) {
      return res.status(404).json({ message: 'Nenhum dado de equipe encontrado.' });
    }

    return res.status(200).json(resultado);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getClientesEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar clientes da equipe.' });
  }
}

export async function getClienteEquipeDetalhe(req: Request, res: Response) {
  try {
    const equipe = await resolverEquipeParam(req);
    const clienteId = Number(req.params.id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      throw new AppError('Identificador de cliente inválido.', 400);
    }

    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    if (mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
      throw new AppError('Mês inválido.', 400);
    }
    if (ano !== undefined && (!Number.isInteger(ano) || ano < 2000 || ano > 2100)) {
      throw new AppError('Ano inválido.', 400);
    }

    const resultado = await buscarClienteEquipeGerente(equipe, clienteId, mes, ano);
    if (!resultado) {
      return res.status(404).json({ message: 'Cliente não encontrado ou sem acesso.' });
    }

    return res.status(200).json(resultado);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getClienteEquipeDetalhe:', err);
    return res.status(500).json({ message: 'Erro ao buscar o cliente.' });
  }
}

export async function getReceitasEquipe(req: Request, res: Response) {
  try {
    const equipe = await resolverEquipeParam(req);
    const vendedorId = paramVendedorId(req.query.vendedorId);
    const agora = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
    const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();

    const receitas = await buscarReceitasEquipeGerente(equipe, vendedorId, mes, ano);
    if (!receitas) {
      return res.status(404).json({ message: 'Nenhum dado de equipe encontrado.' });
    }

    return res.status(200).json(receitas);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getReceitasEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar receitas da equipe.' });
  }
}

export async function getRankingPeriodo(req: Request, res: Response) {
  try {
    const equipe = await resolverEquipeParam(req);
    const periodo = req.query.periodo === 'semana' ? 'semana' : 'dia';
    const membros = await buscarRankingPeriodoGerente(equipe, periodo);
    if (!membros) {
      return res.status(404).json({ message: 'Nenhum dado de equipe encontrado.' });
    }

    return res.status(200).json({ periodo, membros });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getRankingPeriodo:', err);
    return res.status(500).json({ message: 'Erro ao buscar o ranking da equipe.' });
  }
}

export async function getPessoalEquipe(req: Request, res: Response) {
  try {
    const equipe = await resolverEquipeParam(req);
    const vendedorId = Number(req.params.vendedorId);
    if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
      throw new AppError('Identificador de vendedor inválido.', 400);
    }
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    if (mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
      throw new AppError('Mês inválido.', 400);
    }
    if (ano !== undefined && (!Number.isInteger(ano) || ano < 2000 || ano > 2100)) {
      throw new AppError('Ano inválido.', 400);
    }

    const resultado = await buscarPessoalEquipeGerente(equipe, vendedorId, mes, ano);
    if (!resultado) {
      return res.status(404).json({ message: 'Nenhum dado de equipe encontrado.' });
    }

    return res.status(200).json(resultado);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getPessoalEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar o dashboard pessoal do funcionário.' });
  }
}
