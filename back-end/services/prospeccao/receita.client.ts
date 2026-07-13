import axios from 'axios';
import type { ReceitaDTO } from '../../models/cliente.model';

/**
 * Cliente HTTP para dados públicos de CNPJ (Receita Federal).
 *
 * - Primária: BrasilAPI (grátis, sem chave).
 * - Fallback: CNPJá open (grátis, rate limit menor).
 * A consulta roda SOMENTE no backend (esconde detalhes, permite cache, evita
 * CORS). Timeout curto; em falha de ambas, retorna `null` (o service traduz
 * para `receitaIndisponivel`, nunca derruba a request).
 */

const TIMEOUT_MS = 5000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — dado de Receita muda pouco.
const BRASILAPI_BASE = process.env.CNPJ_API_URL ?? 'https://brasilapi.com.br/api/cnpj/v1';
const CNPJA_BASE = 'https://open.cnpja.com/office';

const cache = new Map<string, { dto: ReceitaDTO; exp: number }>();

const http = axios.create({ timeout: TIMEOUT_MS });

function textoOuNull(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim();
  return s.length > 0 ? s : null;
}

/** Normaliza a resposta da BrasilAPI para o DTO estável. */
function normalizarBrasilApi(data: any): ReceitaDTO {
  return {
    razaoSocial: textoOuNull(data.razao_social),
    nomeFantasia: textoOuNull(data.nome_fantasia),
    situacaoCadastral: textoOuNull(data.descricao_situacao_cadastral),
    porte: textoOuNull(data.porte),
    cnaePrincipal: {
      codigo: textoOuNull(data.cnae_fiscal),
      descricao: textoOuNull(data.cnae_fiscal_descricao),
    },
    endereco: { cidade: textoOuNull(data.municipio), uf: textoOuNull(data.uf) },
    aberturaEm: textoOuNull(data.data_inicio_atividade),
  };
}

/** Normaliza a resposta da CNPJá (open) para o DTO estável. */
function normalizarCnpja(data: any): ReceitaDTO {
  return {
    razaoSocial: textoOuNull(data.company?.name),
    nomeFantasia: textoOuNull(data.alias),
    situacaoCadastral: textoOuNull(data.status?.text),
    porte: textoOuNull(data.company?.size?.text),
    cnaePrincipal: {
      codigo: textoOuNull(data.mainActivity?.id),
      descricao: textoOuNull(data.mainActivity?.text),
    },
    endereco: { cidade: textoOuNull(data.address?.city), uf: textoOuNull(data.address?.state) },
    aberturaEm: textoOuNull(data.founded),
  };
}

/**
 * Consulta dados públicos de um CNPJ (14 dígitos).
 * @returns o DTO normalizado, ou `null` se todas as fontes falharem.
 */
export async function consultarReceita(cnpjDigits: string): Promise<ReceitaDTO | null> {
  const chave = cnpjDigits.replace(/\D/g, '');
  if (chave.length !== 14) return null;

  const emCache = cache.get(chave);
  if (emCache && emCache.exp > Date.now()) return emCache.dto;

  let dto: ReceitaDTO | null = null;

  // Primária: BrasilAPI
  try {
    const { data } = await http.get(`${BRASILAPI_BASE}/${chave}`);
    dto = normalizarBrasilApi(data);
  } catch (err) {
    console.warn('[receita.client] BrasilAPI falhou:', (err as Error).message);
  }

  // Fallback: CNPJá
  if (!dto) {
    try {
      const { data } = await http.get(`${CNPJA_BASE}/${chave}`);
      dto = normalizarCnpja(data);
    } catch (err) {
      console.warn('[receita.client] CNPJá falhou:', (err as Error).message);
    }
  }

  if (dto) cache.set(chave, { dto, exp: Date.now() + TTL_MS });
  return dto;
}
