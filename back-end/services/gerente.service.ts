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

/** Times gerenciáveis. Cada gerente enxerga um time por vez (IS ou KAM). */
export type EquipeGerente = 'IS' | 'KAM';

/** Roles de produção que compõem cada time — usadas para resolver os `managerIds`. */
const ROLES_POR_EQUIPE: Record<EquipeGerente, string[]> = {
  IS: ['INSIGHT_SALES'],
  KAM: ['KAM'],
};

/** Chave da meta de equipe (`getMetaEquipe`) correspondente a cada time. */
const META_POR_EQUIPE: Record<EquipeGerente, 'IS' | 'KAM'> = {
  IS: 'IS',
  KAM: 'KAM',
};

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
export async function resolverEquipeGerente(equipe: EquipeGerente): Promise<EquipeResolvida | null> {
  const resolvido = await resolverManagerIdsDaEquipe(ROLES_POR_EQUIPE[equipe]);
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

export async function listarMembrosEquipeGerente(equipe: EquipeGerente): Promise<MembroEquipe[]> {
  const time = await resolverEquipeGerente(equipe);
  if (!time) return [];
  return time.managerIds
    .map((id) => ({ id, nome: time.nomeMap.get(id) ?? 'Desconhecido' }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listarClientesEquipeGerente(
  equipe: EquipeGerente,
  vendedorId: number | undefined,
  filtros: FiltrosListaClientes,
): Promise<(ClientesPaginados & { resumo: ResumoCarteira; filtros: FiltrosClientes }) | null> {
  const time = await resolverEquipeGerente(equipe);
  if (!time) return null;
  validarVendedorNaEquipe(vendedorId, time);

  const ids = vendedorId !== undefined ? [vendedorId] : time.managerIds;
  const [pagina, resumo, filtrosDisponiveis] = await Promise.all([
    listarClientesDoVendedor(ids, filtros),
    buscarResumoCarteira(ids),
    buscarFiltrosClientes(ids),
  ]);

  return { ...pagina, resumo, filtros: filtrosDisponiveis };
}

export async function buscarClienteEquipeGerente(
  equipe: EquipeGerente,
  clienteId: number,
  mes?: number,
  ano?: number,
): Promise<ClienteDetalheResposta | null> {
  const time = await resolverEquipeGerente(equipe);
  if (!time) return null;

  const cliente = await buscarClienteDoVendedor(time.managerIds, clienteId);
  if (!cliente) return null;

  const metricas = await buscarMetricasCliente(clienteId, mes, ano);
  return { cliente, metricas };
}

export async function buscarReceitasEquipeGerente(
  equipe: EquipeGerente,
  vendedorId: number | undefined,
  mes: number,
  ano: number,
): Promise<VisaoGeral | null> {
  const time = await resolverEquipeGerente(equipe);
  if (!time) return null;
  validarVendedorNaEquipe(vendedorId, time);

  const ids = vendedorId !== undefined ? [vendedorId] : time.managerIds;
  const meta = vendedorId !== undefined
    ? getMetaIndividual(time.nomeMap.get(vendedorId) ?? '', mes, ano, vendedorId)
    : getMetaEquipe(META_POR_EQUIPE[equipe], mes, ano);

  return buscarVisaoGeralMes(ids, meta, mes, ano);
}

/** Ranking da equipe de hoje ou da semana atual (domingo–sábado) — sem meta, período menor que um mês. */
export async function buscarRankingPeriodoGerente(equipe: EquipeGerente, periodo: 'dia' | 'semana'): Promise<MetricasEquipeMembro[] | null> {
  const time = await resolverEquipeGerente(equipe);
  if (!time) return null;

  const hoje = await buscarDataHojeSaoPaulo();
  const { inicio, fim } = periodo === 'semana' ? semanaDoDia(hoje) : { inicio: hoje, fim: hoje };

  return buscarRankingPeriodoEquipe(time.managerIds, inicio, fim, time.nomeMap);
}

/** Dashboard pessoal (réplica do Dashboard Pessoal do vendedor) de um funcionário específico da equipe. */
export async function buscarPessoalEquipeGerente(
  equipe: EquipeGerente,
  vendedorId: number,
  mes?: number,
  ano?: number,
): Promise<{ resumo: Omit<MetricasVendedor, 'email'>; topClientesMes: TopCliente[] } | null> {
  const time = await resolverEquipeGerente(equipe);
  if (!time) return null;
  validarVendedorNaEquipe(vendedorId, time);

  const nome = time.nomeMap.get(vendedorId) ?? 'Desconhecido';
  const agora = new Date();
  const mesConsulta = mes ?? agora.getMonth() + 1;
  const anoConsulta = ano ?? agora.getFullYear();

  const [resumo, topClientesMes] = await Promise.all([
    buscarMetricasCompletasPorVendedor({ id: vendedorId, nome }, mesConsulta, anoConsulta),
    buscarTopClientes(vendedorId, mesConsulta, anoConsulta, 10),
  ]);

  return { resumo, topClientesMes };
}
