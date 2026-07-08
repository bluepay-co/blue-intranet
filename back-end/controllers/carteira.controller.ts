import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { buscarVendedorPorEmail } from '../services/metricas.service';
import { radarDeRisco, oportunidadesCrossSell } from '../services/carteira.service';

export async function getRadarRisco(req: Request, res: Response) {
  try {
    const email = req.usuario?.email;
    if (!email) throw new AppError('Usuário não autenticado.', 401);

    const vendedor = await buscarVendedorPorEmail(email);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    const dados = await radarDeRisco(vendedor.id);
    return res.status(200).json(dados);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[carteira.controller] getRadarRisco:', err);
    return res.status(500).json({ message: 'Erro ao carregar o radar de risco.' });
  }
}

export async function getCrossSell(req: Request, res: Response) {
  try {
    const email = req.usuario?.email;
    if (!email) throw new AppError('Usuário não autenticado.', 401);

    const vendedor = await buscarVendedorPorEmail(email);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    const dados = await oportunidadesCrossSell(vendedor.id);
    return res.status(200).json(dados);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[carteira.controller] getCrossSell:', err);
    return res.status(500).json({ message: 'Erro ao carregar as oportunidades de cross-sell.' });
  }
}
