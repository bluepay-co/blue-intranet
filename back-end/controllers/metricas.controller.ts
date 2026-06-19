import type { Request, Response } from 'express';
import {
  buscarMetricasCompletas,
  buscarTopClientes,
  buscarVendedorPorEmail,
  buscarMetricasEquipe,
} from '../services/metricas.service';
import { AppError } from '../utils/app-error';

export async function meuResumo(req: Request, res: Response) {
  try {
    const role = req.usuario?.role;
    const emailJwt = req.usuario?.email;
    if (!emailJwt) throw new AppError('Usuário não autenticado.', 401);

    // DESENVOLVEDOR pode simular qualquer vendedor via ?testEmail=
    const email = (role === 'DESENVOLVEDOR' && typeof req.query.testEmail === 'string')
      ? req.query.testEmail
      : emailJwt;

    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;

    const metricas = await buscarMetricasCompletas(email, mes, ano);
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

export async function topClientes(req: Request, res: Response) {
  try {
    const role = req.usuario?.role;
    const emailJwt = req.usuario?.email;
    if (!emailJwt) throw new AppError('Usuário não autenticado.', 401);

    const email = (role === 'DESENVOLVEDOR' && typeof req.query.testEmail === 'string')
      ? req.query.testEmail
      : emailJwt;

    const agora = new Date();
    const mes    = req.query.mes    ? Number(req.query.mes)    : agora.getMonth() + 1;
    const ano    = req.query.ano    ? Number(req.query.ano)    : agora.getFullYear();
    const limite = req.query.limite ? Number(req.query.limite) : 10;

    const vendedor = await buscarVendedorPorEmail(email);
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
    const role = req.usuario?.role;
    if (!role) throw new AppError('Usuário não autenticado.', 401);

    const agora = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
    const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();

    const equipe = await buscarMetricasEquipe(role, mes, ano);
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
