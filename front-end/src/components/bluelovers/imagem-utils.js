/**
 * Constantes e helpers do campo de imagem dos Bluelovers.
 * Ficam fora do .jsx para não quebrar o fast refresh do Vite, que exige que um
 * arquivo de componente exporte apenas componentes.
 */

/** Limite alinhado ao backend (bluelover.routes.ts). */
export const MAX_IMAGEM_MB = 10
export const MAX_IMAGEM_BYTES = MAX_IMAGEM_MB * 1024 * 1024

/**
 * Proporção e tamanho recomendado de cada imagem do perfil, para o Marketing
 * saber exatamente o que exportar. A proporção casa com a exibida no perfil.
 */
export const IMAGENS_PERFIL = {
  capa: { aspecto: 'aspect-[4/5]', dica: '4:5 — 1080 × 1350 px' },
  perfil: { aspecto: 'aspect-[4/5]', dica: '4:5 — 1080 × 1350 px' },
  viagem: { aspecto: 'aspect-[16/9]', dica: '16:9 — 1600 × 900 px' },
  viagemSonho: { aspecto: 'aspect-[16/9]', dica: '16:9 — 1600 × 900 px' },
  inspiracao: { aspecto: 'aspect-square', dica: '1:1 — 1000 × 1000 px' },
  bluepay: { aspecto: 'aspect-[4/3]', dica: '4:3 — 1200 × 900 px' },
  conquista: { aspecto: 'aspect-[4/3]', dica: '4:3 — 1200 × 900 px' },
  momento: { aspecto: 'aspect-square', dica: '1:1 — 800 × 800 px (exibida em círculo)' },
  momentoMarcante: { aspecto: 'aspect-[4/5]', dica: '4:5 — 1080 × 1350 px' },
}

/** Mesma whitelist do backend (bluelover.routes.ts): SVG fica de fora. */
export const TIPOS_IMAGEM_OK = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** Estado inicial de um campo de imagem vazio. */
export const IMAGEM_VAZIA = { file: null, previewUrl: null, urlRaw: null }

/**
 * Monta o estado do campo a partir de um path já salvo no banco.
 * @param {string|null} path
 * @param {(p: string|null) => string|null} resolver - normalmente `urlFoto`.
 */
export function imagemDoBanco(path, resolver) {
  return { file: null, previewUrl: resolver(path), urlRaw: path ?? null }
}
