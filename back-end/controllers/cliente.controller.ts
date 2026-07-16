import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import { buscarVendedorPorEmail } from '../services/metricas.service';
import { normalizarCnpj, cnpjValido } from '../utils/cnpj';
import { ehFalhaDeConexao } from '../utils/db';
import {
  listarClientesDoVendedor,
  buscarResumoCarteira,
  buscarFiltrosClientes,
  buscarClienteDoVendedor,
  buscarMetricasCliente,
  prospectarCnpj as prospectarCnpjService,
} from '../services/cliente.service';

function paramTexto(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

export async function getMeusClientes(req: Request, res: Response) {
  try {
    const email = req.usuario?.email;
    if (!email) throw new AppError('Usuário não autenticado.', 401);

    const vendedor = await buscarVendedorPorEmail(email);
    if (!vendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado no banco de produção.' });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const [pagina, resumo, filtros] = await Promise.all([
      listarClientesDoVendedor(vendedor.id, {
        busca: paramTexto(req.query.busca),
        uf: paramTexto(req.query.uf),
        cidade: paramTexto(req.query.cidade),
        segmento: paramTexto(req.query.segmento),
        status: paramTexto(req.query.status),
        page,
        limit,
      }),
      buscarResumoCarteira(vendedor.id),
      buscarFiltrosClientes(vendedor.id),
    ]);

    return res.status(200).json({ ...pagina, resumo, filtros });
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

    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    if (mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
      throw new AppError('Mês inválido.', 400);
    }
    if (ano !== undefined && (!Number.isInteger(ano) || ano < 2000 || ano > 2100)) {
      throw new AppError('Ano inválido.', 400);
    }

    const metricas = await buscarMetricasCliente(clienteId, mes, ano);
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
    if (ehFalhaDeConexao(err)) {
      console.error('[cliente.controller] getProspeccaoCnpj (conexão):', (err as Error).message);
      return res.status(503).json({
        message: 'Banco de produção indisponível no momento (verifique a conexão/VPN).',
      });
    }
    console.error('[cliente.controller] getProspeccaoCnpj:', err);
    return res.status(500).json({ message: 'Erro ao prospectar o CNPJ.' });
  }
}
