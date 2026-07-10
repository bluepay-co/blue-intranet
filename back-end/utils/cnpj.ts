/**
 * Utilitários de CNPJ (backend).
 * O banco de produção guarda `clients.cnpj` como texto cru (às vezes com
 * máscara), então normalizamos para dígitos antes de qualquer comparação.
 */

/** Remove tudo que não for dígito. */
export function normalizarCnpj(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** Valida um CNPJ: 14 dígitos + dígitos verificadores (módulo 11). */
export function cnpjValido(valor: string | null | undefined): boolean {
  const cnpj = normalizarCnpj(valor);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // rejeita sequências iguais

  const calcDigito = (base: string): number => {
    let soma = 0;
    let peso = base.length - 7;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dig1 = calcDigito(cnpj.slice(0, 12));
  const dig2 = calcDigito(cnpj.slice(0, 12) + dig1);
  return cnpj.slice(12) === `${dig1}${dig2}`;
}
