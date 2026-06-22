import { useState, useMemo, useRef } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Card, CardContent } from '@/components/ui/card'
import { fmtBRL, fmtNum, parseMoney } from './calc-utils'

ChartJS.register(ArcElement, Tooltip, Legend)

const TEAL = '#0097A7'
const TEAL_LIGHT = '#6DCFE0'
const NAVY = '#091A24'

function calcMod2(s) {
  const totalPremios = s.socios + s.colab
  const taxaAdmin    = totalPremios * s.taxaBP
  const impostosI    = s.lair * 0.34
  const baseII       = Math.max(0, s.lair - totalPremios - taxaAdmin)
  const impostosII   = baseII * 0.34
  const econImpostos = impostosI - impostosII
  const econLiquida  = econImpostos - taxaAdmin
  return { totalPremios, taxaAdmin, impostosI, impostosII, econImpostos, econLiquida,
           lucroLiqI: s.lair - impostosI,
           lucroLiqII: Math.max(0, baseII - impostosII) }
}

function MoneyInput({ label, tooltip, value, onChange }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  function onFocus() {
    setFocused(true)
    setRaw(fmtNum(value))
  }
  function onInput(e) {
    setRaw(e.target.value)
    onChange(parseMoney(e.target.value))
  }
  function onBlur() {
    setFocused(false)
  }

  return (
    <div className="mb-5">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1 mb-2">
        {label}
        {tooltip && (
          <span title={tooltip}
            className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center cursor-help select-none hover:bg-teal-50">
            ?
          </span>
        )}
      </label>
      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 px-3 py-2.5 gap-2 focus-within:border-[#0097A7] focus-within:ring-2 focus-within:ring-[#0097A7]/20 transition-all">
        <span className="text-gray-400 text-sm font-medium shrink-0 select-none">R$</span>
        <input type="text"
               className="flex-1 text-right font-bold text-gray-800 bg-transparent outline-none text-sm min-w-0"
               value={focused ? raw : fmtNum(value)}
               onFocus={onFocus}
               onChange={onInput}
               onBlur={onBlur} />
      </div>
    </div>
  )
}

function makeDonut(impostos, premiaTaxa, lucro) {
  return {
    labels: ['Encargos Tributários', 'Premiações / Investimento BP', 'Lucro Líquido'],
    datasets: [{
      data: [Math.max(0, impostos), Math.max(0, premiaTaxa), Math.max(0, lucro)],
      backgroundColor: ['#EF4444', TEAL_LIGHT, TEAL],
      borderWidth: 2, borderColor: '#fff',
    }],
  }
}

const donutOptions = {
  responsive: true, cutout: '62%',
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtBRL(ctx.raw)}` } },
  },
}

export default function ModuloLucroReal() {
  const [lair, setLair]     = useState(1000000)
  const [socios, setSocios] = useState(200000)
  const [colab, setColab]   = useState(50000)
  const [taxaBPStr, setTaxaBPStr] = useState('10,0')

  const taxaBP = parseMoney(taxaBPStr.replace(',', '.')) / 100

  const d = useMemo(() => calcMod2({ lair, socios, colab, taxaBP }), [lair, socios, colab, taxaBP])

  const sectionRef = useRef(null)

  async function exportarPDF() {
    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')
    const canvas = await html2canvas(sectionRef.current, { scale: 2 })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt',
                            format: [canvas.width / 2, canvas.height / 2] })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
    pdf.save('calculadora-lucro-real.pdf')
  }

  return (
    <div ref={sectionRef}>
      {/* Hero info */}
      <div className="rounded-lg px-5 py-4 mb-8" style={{ borderLeft: `4px solid ${TEAL_LIGHT}`, background: 'rgba(109,207,224,0.08)' }}>
        <p className="text-sm font-semibold" style={{ color: NAVY }}>
          Prêmios pagos via BluePay são{' '}
          <span style={{ color: TEAL }}>estruturados como remuneração inteligente</span>,
          otimizando a base de cálculo de forma totalmente legal e gerando economia real para a empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Parâmetros */}
        <Card className="lg:col-span-2">
          <CardContent className="p-7">
            <p className="text-xs font-bold uppercase tracking-widest mb-7" style={{ color: TEAL }}>Parâmetros</p>

            <MoneyInput label="LAIR — Lucro Antes do IR"
              tooltip="Lucro Antes do IR — resultado operacional bruto da empresa, base de cálculo para estruturação da remuneração inteligente."
              value={lair} onChange={setLair} />

            <MoneyInput label="Prêmio — Sócios / Diretores"
              tooltip="Premiações estruturadas como remuneração inteligente, conforme RIR/2018, Art. 311. Otimizam a base de cálculo do IRPJ (25%) e CSLL (9%)."
              value={socios} onChange={setSocios} />

            <MoneyInput label="Prêmio — Colaboradores"
              tooltip="Premiações a colaboradores via BluePay são estruturadas como remuneração inteligente e lançadas como despesa operacional."
              value={colab} onChange={setColab} />

            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1 mb-2">
                Investimento BluePay
                <span title="Investimento BluePay para processamento e distribuição das premiações como remuneração inteligente."
                  className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center cursor-help select-none hover:bg-teal-50">
                  ?
                </span>
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 px-3 py-2.5 gap-2 focus-within:border-[#0097A7] focus-within:ring-2 focus-within:ring-[#0097A7]/20 transition-all">
                <input type="text" value={taxaBPStr} onChange={(e) => setTaxaBPStr(e.target.value)}
                       className="flex-1 text-right font-bold bg-transparent outline-none text-sm min-w-0"
                       style={{ color: TEAL }} />
                <span className="text-sm font-medium shrink-0 select-none" style={{ color: TEAL }}>%</span>
              </div>
            </div>

            {/* Alíquotas fixas */}
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(9,26,36,0.04)', border: '1px solid rgba(9,26,36,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-400">Alíquotas Lucro Real</p>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-500 font-medium text-xs">IRPJ</span>
                <span className="font-bold text-gray-700 text-xs">25%</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 font-medium text-xs">CSLL</span>
                <span className="font-bold text-gray-700 text-xs">9%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-bold text-xs" style={{ color: NAVY }}>Total</span>
                <span className="font-black text-xs" style={{ color: TEAL }}>34%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* KPI hero */}
          <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)` }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Economia com Remuneração Inteligente BluePay</p>
            <p className="text-4xl font-black leading-none tracking-tight">{fmtBRL(d.econLiquida)}</p>
            <p className="text-xs mt-2 opacity-70">economizado com a remuneração inteligente BluePay</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Encargos sem BluePay</p>
              <p className="text-base font-bold mt-1 text-red-500">{fmtBRL(d.impostosI)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Encargos com BluePay</p>
              <p className="text-base font-bold mt-1" style={{ color: TEAL }}>{fmtBRL(d.impostosII)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Investimento BluePay</p>
              <p className="text-base font-bold mt-1 text-orange-500">{fmtBRL(d.taxaAdmin)}</p>
            </CardContent></Card>
          </div>

          {/* Ganho */}
          <Card className="border-2" style={{ borderColor: 'rgba(109,207,224,0.4)' }}>
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TEAL }}>Ganho com Remuneração Inteligente</p>
              <p className="text-3xl font-black mt-1" style={{ color: TEAL }}>{fmtBRL(d.econImpostos)}</p>
            </CardContent>
          </Card>

          {/* Donuts */}
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-5 text-gray-400">Composição do Resultado</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-center text-gray-400 mb-3 uppercase tracking-wide">Sem BluePay</p>
                  <Doughnut data={makeDonut(d.impostosI, 0, d.lucroLiqI)} options={donutOptions} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-center mb-3 uppercase tracking-wide" style={{ color: TEAL }}>Com BluePay</p>
                  <Doughnut data={makeDonut(d.impostosII, d.totalPremios + d.taxaAdmin, d.lucroLiqII)} options={donutOptions} />
                </div>
              </div>
              <div className="flex justify-center gap-5 mt-5 text-xs font-medium text-gray-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block bg-red-500" />Encargos Tributários
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: TEAL_LIGHT }} />Premiações/Investimento BP
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: TEAL }} />Lucro Líquido
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Aviso dividendos */}
      <div className="mt-6 rounded-xl px-5 py-4 flex gap-3" style={{ background: 'rgba(255,171,64,0.08)', border: '1px solid rgba(255,171,64,0.3)' }}>
        <span className="text-lg shrink-0">⚠️</span>
        <p className="text-xs leading-relaxed" style={{ color: '#595959' }}>
          <strong style={{ color: NAVY }}>Atenção — Tributação de Dividendos:</strong>{' '}
          Esta simulação não contempla a proposta de tributação de 10% sobre distribuição de dividendos que excedam R$&nbsp;50.000/mês por sócio, atualmente em tramitação legislativa.
        </p>
      </div>

      {/* Export button */}
      <div className="flex justify-end mt-6">
        <button onClick={exportarPDF}
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_LIGHT})`, boxShadow: '0 4px 20px rgba(0,151,167,0.45)' }}>
          Exportar PDF
        </button>
      </div>
    </div>
  )
}
