import type { Request, Response } from 'express';
import { Role } from '../models/usuario.model';
import { AppError } from '../utils/app-error';
import {
  registrarReuniao,
  definirLigacoes,
  resumoDaSdr,
  resumoEquipe,
  listarReunioes,
  buscarSdr,
} from '../services/prevendas.service';

/** Cargos que podem lançar/consultar em nome de qualquer SDR (gestão). */
const GESTORES = new Set<Role>([Role.DIRETORIA, Role.DESENVOLVEDOR]);

function ehGestor(role?: Role): boolean {
  return !!role && GESTORES.has(role);
}

/**
 * Resolve a SDR alvo de uma escrita: gestores podem informar `sdrId` no corpo;
 * uma SDR comum só lança para si mesma (ignora qualquer sdrId enviado).
 */
function sdrAlvo(req: Request): number {
  const logadoId = req.usuario?.id;
  if (!logadoId) throw new AppError('Usuário não autenticado.', 401);
  if (ehGestor(req.usuario?.role) && req.body?.sdrId) {
    const alvo = Number(req.body.sdrId);
    if (!Number.isInteger(alvo) || alvo <= 0) throw new AppError('sdrId inválido.', 400);
    return alvo;
  }
  return logadoId;
}

function periodoDaQuery(req: Request) {
  const agora = new Date();
  const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
  const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();
  return { mes, ano };
}

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function getMeuResumo(req: Request, res: Response) {
  try {
    const id = req.usuario?.id;
    if (!id) throw new AppError('Usuário não autenticado.', 401);

    const sdr = await buscarSdr(id);
    if (!sdr) return res.status(404).json({ message: 'Usuário não encontrado ou bloqueado.' });

    const { mes, ano } = periodoDaQuery(req);
    const resumo = await resumoDaSdr(sdr.id, sdr.nome, mes, ano);
    return res.status(200).json(resumo);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[prevendas.controller] getMeuResumo:', err);
    return res.status(500).json({ message: 'Erro ao buscar métricas de Pré-Vendas.' });
  }
}

export async function getMinhasReunioes(req: Request, res: Response) {
  try {
    const id = req.usuario?.id;
    if (!id) throw new AppError('Usuário não autenticado.', 401);

    const sdr = await buscarSdr(id);
    if (!sdr) return res.status(404).json({ message: 'Usuário não encontrado ou bloqueado.' });

    const { mes, ano } = periodoDaQuery(req);
    const reunioes = await listarReunioes(sdr.id, mes, ano);
    return res.status(200).json(reunioes);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[prevendas.controller] getMinhasReunioes:', err);
    return res.status(500).json({ message: 'Erro ao buscar reuniões de Pré-Vendas.' });
  }
}

export async function getEquipe(req: Request, res: Response) {
  try {
    const { mes, ano } = periodoDaQuery(req);
    const dados = await resumoEquipe(mes, ano);
    return res.status(200).json(dados);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[prevendas.controller] getEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar métricas da equipe de Pré-Vendas.' });
  }
}

// ── Escrita (lançamento) ──────────────────────────────────────────────────────

export async function postReuniao(req: Request, res: Response) {
  try {
    const sdrId = sdrAlvo(req);
    const criada = await registrarReuniao(sdrId, {
      empresa: req.body?.empresa,
      vendedorNome: req.body?.vendedorNome ?? null,
      segmento: req.body?.segmento ?? null,
      ano: req.body?.ano,
      mes: req.body?.mes,
      semana: req.body?.semana,
      status: req.body?.status,
    });
    return res.status(201).json(criada);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[prevendas.controller] postReuniao:', err);
    return res.status(500).json({ message: 'Erro ao registrar reunião.' });
  }
}

export async function putLigacoes(req: Request, res: Response) {
  try {
    const sdrId = sdrAlvo(req);
    await definirLigacoes(sdrId, {
      ano: req.body?.ano,
      mes: req.body?.mes,
      semana: req.body?.semana,
      quantidade: req.body?.quantidade,
    });
    return res.status(200).json({ message: 'Ligações atualizadas.' });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[prevendas.controller] putLigacoes:', err);
    return res.status(500).json({ message: 'Erro ao atualizar ligações.' });
  }
}
