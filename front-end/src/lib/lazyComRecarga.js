import { lazy } from 'react'

const CHAVE_RECARGA = 'intranet_recarga_chunk'

/**
 * `React.lazy` que sobrevive a deploy: quem está com a aba aberta de um build
 * antigo pede um chunk que não existe mais. Nesse caso recarrega a página uma
 * vez (pegando o index.html novo); se falhar de novo, propaga o erro.
 *
 * @param {() => Promise<{ default: React.ComponentType }>} importar
 */
export function lazyComRecarga(importar) {
  return lazy(() =>
    importar()
      .then((modulo) => {
        sessionStorage.removeItem(CHAVE_RECARGA)
        return modulo
      })
      .catch((erro) => {
        if (sessionStorage.getItem(CHAVE_RECARGA)) throw erro
        sessionStorage.setItem(CHAVE_RECARGA, '1')
        window.location.reload()
        return new Promise(() => {}) // segura o Suspense até o reload
      }),
  )
}
