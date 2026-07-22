import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  listarMembrosEquipeGerente,
  listarClientesEquipeGerente,
  buscarClienteEquipeGerente,
  buscarReceitasEquipeGerente,
} from '../services/gerente.service';

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

export async function getMembrosEquipe(_req: Request, res: Response) {
  try {
    const membros = await listarMembrosEquipeGerente();
    return res.status(200).json({ membros });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[gerente.controller] getMembrosEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar membros da equipe.' });
  }
}

export async function getClientesEquipe(req: Request, res: Response) {
  try {
    const vendedorId = paramVendedorId(req.query.vendedorId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const resultado = await listarClientesEquipeGerente(vendedorId, {
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

    const resultado = await buscarClienteEquipeGerente(clienteId, mes, ano);
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
    const vendedorId = paramVendedorId(req.query.vendedorId);
    const agora = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
    const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();

    const receitas = await buscarReceitasEquipeGerente(vendedorId, mes, ano);
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
