export const fmtBRL = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v || 0)

export const fmtNum = (v) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v || 0)

export const parseMoney = (str) => {
  if (!str) return 0
  const s = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(s) || 0
}

export const fmtPct = (v) => `+${(v * 100).toFixed(1).replace('.', ',')}%`

export const sliderClass =
  'w-full h-1 rounded-full bg-gray-200 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0097A7] [&::-webkit-slider-thumb]:shadow-md'
