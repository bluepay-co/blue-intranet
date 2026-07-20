import type { Request, Response } from 'express';
import {
  buscarMetricasCompletas,
  buscarTopClientes,
  buscarVendedorPorEmail,
  buscarMetricasEquipe,
  buscarMetricasGerais,
  buscarVisaoGeralMes,
} from '../services/metricas.service';
import { AppError } from '../utils/app-error';
import { pool } from '../database/pool';

export async function meuResumo(req: Request, res: Response) {
  try {
    const emailJwt = req.usuario?.email;
    if (!emailJwt) throw new AppError('Usuário não autenticado.', 401);

    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;

    const metricas = await buscarMetricasCompletas(emailJwt, mes, ano);
    if (!metricas) {
      return res.status(404).json({
        message: 'Nenhuma métrica encontrada para este usuário no banco de produção.',
      });
    }

    return res.status(200).json(metricas);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[metricas.controller] meuResumo:', err);
    return res.status(500).json({ message: 'Erro ao buscar métricas.' });
  }
}

export async function visaoGeral(req: Request, res: Response) {
  try {
    const emailJwt = req.usuario?.email;
    if (!emailJwt) throw new AppError('Usuário não autenticado.', 401);

    const agora = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
    const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();

    const vendedor = await buscarVendedorPorEmail(emailJwt);
    if (!vendedor) {
      return res.status(404).json({
        message: 'Nenhuma métrica encontrada para este usuário no banco de produção.',
      });
    }

    const visao = await buscarVisaoGeralMes(vendedor.id, vendedor.nome, mes, ano);
    return res.status(200).json(visao);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[metricas.controller] visaoGeral:', err);
    return res.status(500).json({ message: 'Erro ao buscar a visão geral.' });
  }
}

export async function topClientes(req: Request, res: Response) {
  try {
    const emailJwt = req.usuario?.email;
    if (!emailJwt) throw new AppError('Usuário não autenticado.', 401);

    const agora = new Date();
    const mes    = req.query.mes    ? Number(req.query.mes)    : agora.getMonth() + 1;
    const ano    = req.query.ano    ? Number(req.query.ano)    : agora.getFullYear();
    const limite = req.query.limite ? Number(req.query.limite) : 10;

    const vendedor = await buscarVendedorPorEmail(emailJwt);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    const clientes = await buscarTopClientes(vendedor.id, mes, ano, limite);
    return res.status(200).json(clientes);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[metricas.controller] topClientes:', err);
    return res.status(500).json({ message: 'Erro ao buscar top clientes.' });
  }
}

export async function minhaEquipe(req: Request, res: Response) {
  try {
    const userId = req.usuario?.id;
    if (!userId) throw new AppError('Usuário não autenticado.', 401);

    // Busca role sempre do banco — ignora o JWT para não depender de token desatualizado
    const { rows } = await pool.query(
      `SELECT role FROM blue_intranet.usuarios WHERE id = $1 AND bloqueado = false`,
      [userId]
    );
    if (!rows[0]) throw new AppError('Usuário não encontrado ou bloqueado.', 403);
    const role: string = rows[0].role;

    const agora = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
    const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();

    // Se vier query param ?equipe=IS|KAM, força a equipe independente do role do usuário
    const equipeParam = req.query.equipe as string | undefined;
    let roles: string[];
    if (equipeParam === 'IS') {
      roles = ['INSIGHT_SALES'];
    } else if (equipeParam === 'KAM') {
      roles = ['KAM'];
    } else if (role === 'DESENVOLVEDOR') {
      roles = ['VENDAS', 'KAM', 'INSIGHT_SALES'];
    } else {
      roles = [role];
    }

    const equipe = await buscarMetricasEquipe(roles, mes, ano);
    if (!equipe) {
      return res.status(404).json({
        message: 'Nenhum dado de equipe encontrado para este cargo.',
      });
    }

    return res.status(200).json(equipe);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[metricas.controller] minhaEquipe:', err);
    return res.status(500).json({ message: 'Erro ao buscar métricas da equipe.' });
  }
}

export async function metricasGerais(req: Request, res: Response) {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;

    const metricas = await buscarMetricasGerais(mes, ano);
    return res.status(200).json(metricas);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[metricas.controller] metricasGerais:', err);
    return res.status(500).json({ message: 'Erro ao buscar métricas gerais.' });
  }
}
