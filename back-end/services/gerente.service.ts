import { AppError } from '../utils/app-error';
import { getMetaIndividual, getMetaEquipe } from '../data/metas2026';
import {
  resolverManagerIdsDaEquipe,
  buscarVisaoGeralMes,
  buscarDataHojeSaoPaulo,
  buscarRankingPeriodoEquipe,
  semanaDoDia,
  buscarMetricasCompletasPorVendedor,
  buscarTopClientes,
} from './metricas.service';
import {
  listarClientesDoVendedor,
  buscarResumoCarteira,
  buscarFiltrosClientes,
  buscarClienteDoVendedor,
  buscarMetricasCliente,
  type FiltrosListaClientes,
} from './cliente.service';
import type { ClientesPaginados, ResumoCarteira, FiltrosClientes, ClienteDetalheResposta } from '../models/cliente.model';
import type { VisaoGeral, MetricasEquipeMembro, MetricasVendedor, TopCliente } from '../models/metricas.model';
import type { MembroEquipe } from '../models/gerente.model';

/**
 * Domínio: dados de equipe para os cargos de gerência (`GERENTE_*`).
 * Escopo sempre resolvido a partir da role de quem chama — nunca do e-mail do
 * gerente (gerentes não têm linha em `users` de produção) nem de um id vindo
 * direto do request.
 */

const ROLES_TIME_IS = ['INSIGHT_SALES'];

interface EquipeResolvida {
  managerIds: number[];
  nomeMap: Map<number, string>;
}

/**
 * `users.id` (produção) é `bigint` — o driver do Postgres devolve esses ids
 * como string, não number, mesmo com o tipo declarado `number` em
 * `resolverManagerIdsDaEquipe`. Normalizamos para number aqui (só na cópia
 * usada por este módulo) para que comparações/lookups em JS (`.includes`,
 * `Map.get`) funcionem contra o `vendedorId` vindo da query string, que já é
 * um number de verdade (`Number(req.query.vendedorId)`).
 */
export async function resolverEquipeGerente(): Promise<EquipeResolvida | null> {
  const resolvido = await resolverManagerIdsDaEquipe(ROLES_TIME_IS);
  if (!resolvido) return null;
  return {
    managerIds: resolvido.managerIds.map(Number),
    nomeMap: new Map(Array.from(resolvido.nomeMap.entries()).map(([id, nome]) => [Number(id), nome])),
  };
}

/** Garante que `vendedorId` (se informado) pertence à equipe — nunca aceitar id fora do escopo. */
function validarVendedorNaEquipe(vendedorId: number | undefined, equipe: EquipeResolvida): void {
  if (vendedorId !== undefined && !equipe.managerIds.includes(vendedorId)) {
    throw new AppError('Vendedor fora da sua equipe.', 403);
  }
}

export async function listarMembrosEquipeGerente(): Promise<MembroEquipe[]> {
  const equipe = await resolverEquipeGerente();
  if (!equipe) return [];
  return equipe.managerIds
    .map((id) => ({ id, nome: equipe.nomeMap.get(id) ?? 'Desconhecido' }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listarClientesEquipeGerente(
  vendedorId: number | undefined,
  filtros: FiltrosListaClientes,
): Promise<(ClientesPaginados & { resumo: ResumoCarteira; filtros: FiltrosClientes }) | null> {
  const equipe = await resolverEquipeGerente();
  if (!equipe) return null;
  validarVendedorNaEquipe(vendedorId, equipe);

  const ids = vendedorId !== undefined ? [vendedorId] : equipe.managerIds;
  const [pagina, resumo, filtrosDisponiveis] = await Promise.all([
    listarClientesDoVendedor(ids, filtros),
    buscarResumoCarteira(ids),
    buscarFiltrosClientes(ids),
  ]);

  return { ...pagina, resumo, filtros: filtrosDisponiveis };
}

export async function buscarClienteEquipeGerente(
  clienteId: number,
  mes?: number,
  ano?: number,
): Promise<ClienteDetalheResposta | null> {
  const equipe = await resolverEquipeGerente();
  if (!equipe) return null;

  const cliente = await buscarClienteDoVendedor(equipe.managerIds, clienteId);
  if (!cliente) return null;

  const metricas = await buscarMetricasCliente(clienteId, mes, ano);
  return { cliente, metricas };
}

export async function buscarReceitasEquipeGerente(
  vendedorId: number | undefined,
  mes: number,
  ano: number,
): Promise<VisaoGeral | null> {
  const equipe = await resolverEquipeGerente();
  if (!equipe) return null;
  validarVendedorNaEquipe(vendedorId, equipe);

  const ids = vendedorId !== undefined ? [vendedorId] : equipe.managerIds;
  const meta = vendedorId !== undefined
    ? getMetaIndividual(equipe.nomeMap.get(vendedorId) ?? '', mes, ano, vendedorId)
    : getMetaEquipe('IS', mes, ano);

  return buscarVisaoGeralMes(ids, meta, mes, ano);
}

/** Ranking da equipe de hoje ou da semana atual (domingo–sábado) — sem meta, período menor que um mês. */
export async function buscarRankingPeriodoGerente(periodo: 'dia' | 'semana'): Promise<MetricasEquipeMembro[] | null> {
  const equipe = await resolverEquipeGerente();
  if (!equipe) return null;

  const hoje = await buscarDataHojeSaoPaulo();
  const { inicio, fim } = periodo === 'semana' ? semanaDoDia(hoje) : { inicio: hoje, fim: hoje };

  return buscarRankingPeriodoEquipe(equipe.managerIds, inicio, fim, equipe.nomeMap);
}

/** Dashboard pessoal (réplica do Dashboard Pessoal do vendedor) de um funcionário específico da equipe. */
export async function buscarPessoalEquipeGerente(
  vendedorId: number,
  mes?: number,
  ano?: number,
): Promise<{ resumo: Omit<MetricasVendedor, 'email'>; topClientesMes: TopCliente[] } | null> {
  const equipe = await resolverEquipeGerente();
  if (!equipe) return null;
  validarVendedorNaEquipe(vendedorId, equipe);

  const nome = equipe.nomeMap.get(vendedorId) ?? 'Desconhecido';
  const agora = new Date();
  const mesConsulta = mes ?? agora.getMonth() + 1;
  const anoConsulta = ano ?? agora.getFullYear();

  const [resumo, topClientesMes] = await Promise.all([
    buscarMetricasCompletasPorVendedor({ id: vendedorId, nome }, mesConsulta, anoConsulta),
    buscarTopClientes(vendedorId, mesConsulta, anoConsulta, 10),
  ]);

  return { resumo, topClientesMes };
}
