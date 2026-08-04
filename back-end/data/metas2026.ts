// Metas mensais 2026 — fonte: planilha "Metas Bluepay _ 2026 - 1Q2026 - Planejado.csv"
// Índice 0 = janeiro, índice 11 = dezembro.
//
// IMPORTANTE — desambiguação por sobrenome:
// A partir de 07/2026 existem dois "Rafael" (Rafael Pina = KAM, Rafael Zanelli = IS).
// Como o sistema casava a meta apenas pelo primeiro nome, aqui cada colaborador é uma
// entrada com { chave (primeiro nome), sobrenome? }. Quando há mais de um mesmo primeiro
// nome, o lookup escolhe pela presença do `sobrenome` no nome completo do vendedor.

interface MetaColaborador {
  /** Primeiro nome normalizado (minúsculo, sem acento). */
  chave: string;
  /**
   * IDs do vendedor no banco de produção (bluepay3_production.users).
   * Forma mais segura de casar a meta: imune a variação de grafia do nome.
   * Preenchido para os casos de colisão de primeiro nome (ex.: os dois "Rafael").
   */
  ids?: number[];
  /** Sobrenome normalizado — fallback de desambiguação quando não há match por ID. */
  sobrenome?: string;
  /** Metas mensais [jan..dez]. */
  metas: number[];
}

const METAS_INDIVIDUAIS_2026: MetaColaborador[] = [
  // KAMs
  { chave: 'marcos',                                    metas: [243378, 252887, 257944, 287518.54, 294014.56, 301364.93, 444231.10, 453115.72, 465576.40, 302881.04, 310453.06, 327527.98] },
  { chave: 'guilherme',                                 metas: [197594, 201051, 205072, 223031.45, 238607.24, 244572.42, 356235.35, 363360.06, 373352.46, 240798.32, 246818.28, 260393.29] },
  { chave: 'ricardo',                                   metas: [144761, 147294, 150240,  94499.27,  96861.75,  99283.30,         0,         0,         0, 176413.82, 180824.17, 190769.49] },
  { chave: 'lael',                                      metas: [187823, 192960, 196819, 200263.44, 209731.45, 214974.74, 339009.20, 220511.59, 226575.65, 231107.17, 236884.85, 249913.51] },
  { chave: 'rafael', ids: [3140],  sobrenome: 'pina',    metas: [136168, 142655, 145508, 168054.24, 172255.60, 176561.99, 272338.49, 277785.26, 285424.35, 170856.93, 175128.35, 184760.41] },
  { chave: 'leandro',                                   metas: [469296, 478643, 488216, 494862.48, 503604.95, 516195.07,         0,         0,         0, 573268.38, 587600.09, 619918.10] },
  { chave: 'mayderson', ids: [6863],                    metas: [     0,      0,      0,         0,         0,         0,  25690.96,  26204.78,  26925.41,         0,         0,         0] },
  // ISs
  { chave: 'joao',                                      metas: [ 31429,  30185,  30788,  33224.17,  34054.77,  34906.14,  41451.13,  42280.15,  43442.86,  36151.93,  37055.73,  39093.80] },
  { chave: 'samuel',                                    metas: [ 31044,  26302,  26828,  27297.50,  28671.88,  29388.67,  34111.70,  34793.93,  35750.77,  31501.75,  32289.29,  34065.20] },
  { chave: 'andre',                                     metas: [ 59309,  56343,  57470,  57415.37,  57257.61,  58689.05,  77874.30,  79431.79,  81616.16,  67481.72,  69168.77,  72973.05] },
  { chave: 'luis',                                      metas: [ 65489,  65381,  66689,  67855.87,  49900.88,  51148.40,  63177.03,  64440.57,  66212.69,  78306.75,  80264.42,  84678.96] },
  { chave: 'tiago',                                     metas: [     0,      0,      0,   9500.00,  10412.19,  10672.49,  10882.25,  11099.90,  11405.14,         0,         0,         0] },
  { chave: 'giovanna', ids: [6862],                     metas: [     0,      0,      0,         0,         0,         0,   6475.12,   6604.62,   6786.25,         0,         0,         0] },
  { chave: 'rafael', ids: [6861], sobrenome: 'zanelli', metas: [     0,      0,      0,         0,         0,         0,  20470.63,  20880.04,  21454.24,         0,         0,         0] },
];

// Totais de equipe — array [jan, fev, ..., dez]
const META_KAM_2026   = [1462729, 1500664, 1530678, 1556627.51, 1605683.60, 1645825.69, 1626530.60, 1659061.21, 1704685.40, 1797338.45, 1842271.91, 1943596.86];
const META_IS_2026    = [ 187271,  178211,  181775,  195292.91,  180297.34,  184804.77,  254442.16,  259531.00,  266668.11,  213442.15,  218778.21,  230811.01];
const META_TOTAL_2026 = [1650000, 1678875, 1712453, 1751920.42, 1785980.93, 1830630.46, 1880972.76, 1918592.22, 1971353.50, 2010780.60, 2061050.12, 2174407.87];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Quebra o nome completo em tokens normalizados (sem acento, minúsculo). */
function tokensNome(nomeCompleto: string): string[] {
  return normalizar(nomeCompleto ?? '').trim().split(/\s+/).filter(Boolean);
}

/**
 * Meta individual do colaborador no mês.
 *
 * Casa a meta na seguinte ordem de segurança:
 *   1. Por `vendedorId` (ID do banco de produção) — imune a variação de grafia;
 *   2. Por sobrenome presente no nome completo (fallback p/ homônimos sem ID);
 *   3. Por primeiro nome, quando não há colisão.
 *
 * `nomeCompleto` deve ser o nome inteiro do vendedor (não só o primeiro nome).
 */
export function getMetaIndividual(
  nomeCompleto: string,
  mes: number,
  ano: number,
  vendedorId?: number,
): number {
  if (ano !== 2026) return 0;

  // 1. Match direto por ID — não depende do nome.
  if (vendedorId != null) {
    const porId = METAS_INDIVIDUAIS_2026.find((c) => c.ids?.includes(vendedorId));
    if (porId) return porId.metas[mes - 1] ?? 0;
  }

  const tokens = tokensNome(nomeCompleto);
  const primeiro = tokens[0] ?? '';
  if (!primeiro) return 0;

  const candidatos = METAS_INDIVIDUAIS_2026.filter((c) => c.chave === primeiro);
  if (candidatos.length === 0) return 0;

  let escolhido: MetaColaborador | undefined;
  if (candidatos.length === 1) {
    escolhido = candidatos[0];
  } else {
    // Homônimos sem ID: escolhe pelo sobrenome presente no nome completo.
    escolhido =
      candidatos.find((c) => c.sobrenome && tokens.includes(c.sobrenome)) ??
      candidatos.find((c) => !c.sobrenome); // fallback: entrada sem sobrenome, se houver
  }

  return escolhido ? (escolhido.metas[mes - 1] ?? 0) : 0;
}

export function getMetaEquipe(equipe: 'KAM' | 'IS' | 'GERAL', mes: number, ano: number): number {
  if (ano !== 2026) return 0;
  const arr = equipe === 'KAM' ? META_KAM_2026 : equipe === 'IS' ? META_IS_2026 : META_TOTAL_2026;
  return arr[mes - 1] ?? 0;
}
