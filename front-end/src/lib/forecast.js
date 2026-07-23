import { chaveDia, addDias, inicioDaSemana } from '@/lib/datas'

/**
 * Cálculos de forecast (projeção de fechamento) compartilhados entre a visão
 * de equipe do gerente (`ForecastIS.jsx`) e a visão pessoal de cada
 * funcionário (`ForecastPessoal.jsx`). Tudo aqui é puro — só recebe números e
 * mapas de dia já buscados, sem saber se é "equipe" ou "uma pessoa só".
 */

/** Verde ≥100% da meta projetada, amarelo ≥70%, vermelho abaixo disso — mesmos cortes já usados no resto do app. */
export function corPorProjecao(valorPct) {
  if (valorPct >= 100) return { texto: 'text-emerald-600', bg: 'bg-emerald-500/10', barra: 'bg-emerald-500', label: 'Vai bater a meta' }
  if (valorPct >= 70)  return { texto: 'text-amber-600',   bg: 'bg-amber-500/10',   barra: 'bg-amber-500',   label: 'Perto da meta' }
  return                 { texto: 'text-red-500',      bg: 'bg-red-500/10',      barra: 'bg-red-500',     label: 'Abaixo da meta' }
}

/**
 * Ritmo diário → projeção de fechamento do mês, a partir do realizado até
 * hoje, mais o ritmo que falta manter nos dias restantes pra bater a meta.
 */
export function calcularForecast(receita, meta, diasDecorridos, diasNoMes, diasRestantes) {
  const ritmoDiario = diasDecorridos > 0 ? receita / diasDecorridos : 0
  const projecao = ritmoDiario * diasNoMes
  const pctProjetado = meta > 0 ? (projecao / meta) * 100 : 0
  const gap = meta - projecao
  const faltante = Math.max(0, meta - receita)
  const ritmoNecessario = diasRestantes > 0 ? faltante / diasRestantes : (faltante > 0 ? null : 0)
  return { ritmoDiario, projecao, pctProjetado, gap, faltante, ritmoNecessario }
}

/** Ritmo dos últimos `janela` dias corridos do mês (não cruza pro mês anterior) vs o ritmo médio do mês inteiro. */
export function calcularTendencia(diasPorChave, hoje, diasDecorridos, ritmoMes) {
  const janela = Math.min(7, diasDecorridos)
  if (janela === 0) return null
  let soma = 0
  for (let i = 0; i < janela; i++) {
    soma += diasPorChave.get(chaveDia(addDias(hoje, -i)))?.receita ?? 0
  }
  const ritmoRecente = soma / janela
  const variacao = ritmoMes > 0 ? ((ritmoRecente - ritmoMes) / ritmoMes) * 100 : null
  return { janela, ritmoRecente, variacao }
}

/** Soma a receita do mês anterior do dia 1 até o mesmo "dia do mês" de hoje (limitado aos dias que o mês anterior teve). */
export function calcularReceitaMesmoPeriodoAnterior(diasPorChave, mesAnteriorNum, anoAnteriorNum, diasDecorridos) {
  const diasNoMesAnterior = new Date(anoAnteriorNum, mesAnteriorNum, 0).getDate()
  const corte = Math.min(diasDecorridos, diasNoMesAnterior)
  let soma = 0
  for (let d = 1; d <= corte; d++) {
    const chave = `${anoAnteriorNum}-${String(mesAnteriorNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    soma += diasPorChave.get(chave)?.receita ?? 0
  }
  return soma
}

/**
 * Forecast da semana atual (domingo–sábado, mesma convenção do resto do app).
 * `diasPorChave` precisa cobrir o mês atual E o anterior — a semana pode
 * começar no mês passado quando hoje cai no início do mês.
 */
export function calcularForecastSemana(diasPorChave, hoje) {
  const inicioSemanaAtual = inicioDaSemana(hoje)
  const diaSemanaIndex = hoje.getDay() // 0 = domingo .. 6 = sábado
  const diasDecorridos = diaSemanaIndex + 1
  const diasRestantes = 6 - diaSemanaIndex

  let realizado = 0
  for (let i = 0; i < diasDecorridos; i++) {
    realizado += diasPorChave.get(chaveDia(addDias(inicioSemanaAtual, i)))?.receita ?? 0
  }
  const ritmoDiario = diasDecorridos > 0 ? realizado / diasDecorridos : 0
  const projecao = ritmoDiario * 7

  // Semana passada, mesmo corte de dias (domingo a domingo+diasDecorridos-1) — comparação justa com uma semana parcial.
  const inicioSemanaPassada = addDias(inicioSemanaAtual, -7)
  let realizadoSemanaPassada = 0
  for (let i = 0; i < diasDecorridos; i++) {
    realizadoSemanaPassada += diasPorChave.get(chaveDia(addDias(inicioSemanaPassada, i)))?.receita ?? 0
  }
  const deltaVsSemanaPassada = realizadoSemanaPassada > 0
    ? ((realizado - realizadoSemanaPassada) / realizadoSemanaPassada) * 100
    : null

  return {
    inicioSemanaAtual, diasDecorridos, diasRestantes,
    realizado, ritmoDiario, projecao,
    realizadoSemanaPassada, deltaVsSemanaPassada,
  }
}

/** Receita da semana atual por funcionário, a partir de `dias[].clientes[]` (já vem com vendedorId/vendedorNome). Só faz sentido pra visão de equipe. */
export function calcularForecastSemanaPorFuncionario(diasPorChave, inicioSemanaAtual, diasDecorridos) {
  const porVendedor = new Map()
  for (let i = 0; i < diasDecorridos; i++) {
    const dia = diasPorChave.get(chaveDia(addDias(inicioSemanaAtual, i)))
    for (const c of dia?.clientes ?? []) {
      const id = c.vendedorId
      if (!porVendedor.has(id)) porVendedor.set(id, { vendedorId: id, nome: c.vendedorNome ?? 'Desconhecido', receita: 0 })
      porVendedor.get(id).receita += c.receita
    }
  }
  return Array.from(porVendedor.values())
    .map((v) => ({ ...v, ritmoDiario: diasDecorridos > 0 ? v.receita / diasDecorridos : 0 }))
    .sort((a, b) => b.receita - a.receita)
}
