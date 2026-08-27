/**
 * Constantes e helpers do campo de imagem dos Bluelovers.
 * Ficam fora do .jsx para não quebrar o fast refresh do Vite, que exige que um
 * arquivo de componente exporte apenas componentes.
 */

/** Limite alinhado ao backend (bluelover.routes.ts). */
export const MAX_IMAGEM_MB = 10
export const MAX_IMAGEM_BYTES = MAX_IMAGEM_MB * 1024 * 1024

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
