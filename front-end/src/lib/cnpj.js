/** Utilitários de CNPJ (front-end): dígitos, máscara e validação. */

/** Remove tudo que não for dígito. */
export function apenasDigitos(valor) {
  return (valor ?? '').replace(/\D/g, '')
}

/** Aplica a máscara 00.000.000/0000-00 progressivamente (para input/exibição). */
export function formatarCnpj(valor) {
  const d = apenasDigitos(valor).slice(0, 14)
  let out = d
  if (d.length > 2) out = `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length > 5) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length > 8) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  if (d.length > 12) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return out
}

/** Valida um CNPJ: 14 dígitos + dígitos verificadores (módulo 11). */
export function cnpjValido(valor) {
  const cnpj = apenasDigitos(valor)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calcDigito = (base) => {
    let soma = 0
    let peso = base.length - 7
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const dig1 = calcDigito(cnpj.slice(0, 12))
  const dig2 = calcDigito(cnpj.slice(0, 12) + dig1)
  return cnpj.slice(12) === `${dig1}${dig2}`
}
