import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { buscarVendedorPorEmail } from '../services/metricas.service';
import { normalizarCnpj, cnpjValido } from '../utils/cnpj';
import {
  listarClientesDoVendedor,
  buscarClienteDoVendedor,
  buscarMetricasCliente,
  prospectarCnpj as prospectarCnpjService,
} from '../services/cliente.service';

export async function getMeusClientes(req: Request, res: Response) {
  try {
    const email = req.usuario?.email;
    if (!email) throw new AppError('Usuário não autenticado.', 401);

    const vendedor = await buscarVendedorPorEmail(email);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;
    const clientes = await listarClientesDoVendedor(vendedor.id, busca);
    return res.status(200).json({ clientes });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[cliente.controller] getMeusClientes:', err);
    return res.status(500).json({ message: 'Erro ao buscar clientes.' });
  }
}

export async function getClienteDetalhe(req: Request, res: Response) {
  try {
    const email = req.usuario?.email;
    if (!email) throw new AppError('Usuário não autenticado.', 401);

    const clienteId = Number(req.params.id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      throw new AppError('Identificador de cliente inválido.', 400);
    }

    const vendedor = await buscarVendedorPorEmail(email);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    // Segurança: só retorna se o cliente pertencer ao vendedor logado.
    const cliente = await buscarClienteDoVendedor(vendedor.id, clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado ou sem acesso.' });
    }

    const metricas = await buscarMetricasCliente(clienteId);
    return res.status(200).json({ cliente, metricas });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[cliente.controller] getClienteDetalhe:', err);
    return res.status(500).json({ message: 'Erro ao buscar o cliente.' });
  }
}

export async function getProspeccaoCnpj(req: Request, res: Response) {
  try {
    const email = req.usuario?.email;
    if (!email) throw new AppError('Usuário não autenticado.', 401);

    const cnpjParam = typeof req.query.cnpj === 'string' ? req.query.cnpj : '';
    if (!cnpjValido(cnpjParam)) {
      throw new AppError('CNPJ inválido.', 400);
    }

    const vendedor = await buscarVendedorPorEmail(email);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    const resultado = await prospectarCnpjService(vendedor.id, normalizarCnpj(cnpjParam));
    return res.status(200).json(resultado);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[cliente.controller] getProspeccaoCnpj:', err);
    return res.status(500).json({ message: 'Erro ao prospectar o CNPJ.' });
  }
}
