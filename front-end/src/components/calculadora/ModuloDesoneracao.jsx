import { useState, useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import { Card, CardContent } from '@/components/ui/card'
import { fmtBRL, fmtNum, parseMoney, sliderClass } from './calc-utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const TEAL = '#0097A7'
const TEAL_LIGHT = '#6DCFE0'
const NAVY = '#091A24'

function calcMod1(s) {
  const folhaI   = s.salario * (1 + s.encargos)
  const premioI  = s.premios * (1 + s.encargos)
  const folhaII  = s.salario * (1 + s.encargos)
  const premioII = s.premios * (1 + s.taxaBP)
  const cenI  = folhaI  + premioI
  const cenII = folhaII + premioII
  return { cenI, cenII, folhaI, premioI, folhaII, premioII,
           econMensal: cenI - cenII, econAnual: (cenI - cenII) * 12 }
}

function SliderParam({ label, tooltip, value, min, max, step, onChange, display }) {
  return (
    <div className="mb-7">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
          {label}
          {tooltip && (
            <span title={tooltip}
              className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center cursor-help select-none hover:bg-teal-50">
              ?
            </span>
          )}
        </label>
        <span className="text-sm font-bold" style={{ color: TEAL }}>{display}</span>
      </div>
      <input type="range" className={sliderClass} min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  )
}

export default function ModuloDesoneracao() {
  const [salario, setSalario]   = useState(100000)
  const [premios, setPremios]   = useState(50000)
  const [encargos, setEncargos] = useState(60)
  const [taxaBPStr, setTaxaBPStr] = useState('10,0')

  const taxaBP = parseMoney(taxaBPStr.replace(',', '.')) / 100

  const d = useMemo(
    () => calcMod1({ salario, premios, encargos: encargos / 100, taxaBP }),
    [salario, premios, encargos, taxaBP],
  )

  const chartData = {
    labels: ['Cenário I — CLT Padrão', 'Cenário II — BluePay'],
    datasets: [
      { label: 'Folha + Encargos', data: [d.folhaI, d.folhaII],
        backgroundColor: NAVY, borderRadius: 5 },
      { label: 'Prêmios + Encargos / Taxa', data: [d.premioI, d.premioII],
        backgroundColor: TEAL_LIGHT, borderRadius: 5 },
    ],
  }

  const chartOptions = {
    indexAxis: 'y', responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Montserrat', size: 11 }, padding: 14 } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtBRL(ctx.raw)}` } },
    },
    scales: {
      x: { stacked: true, ticks: { callback: (v) => fmtBRL(v), font: { size: 10 }, maxRotation: 0 },
           grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { stacked: true, grid: { display: false } },
    },
  }

  const sectionRef = useRef(null)

  async function exportarPDF() {
    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')
    const canvas = await html2canvas(sectionRef.current, { scale: 2 })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt',
                            format: [canvas.width / 2, canvas.height / 2] })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
    pdf.save('calculadora-desoneracao-clt.pdf')
  }

  return (
    <div ref={sectionRef}>
      {/* Hero info */}
      <div className="rounded-lg px-5 py-4 mb-8" style={{ borderLeft: `4px solid ${TEAL_LIGHT}`, background: 'rgba(109,207,224,0.08)' }}>
        <p className="text-sm font-semibold" style={{ color: NAVY }}>
          Prêmios pagos via BluePay{' '}
          <span style={{ color: TEAL }}>não geram INSS, FGTS, Férias nem 13º</span>{' '}
          — incidem apenas a taxa de serviço, gerando economia imediata sobre a folha.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Parâmetros */}
        <Card className="lg:col-span-2">
          <CardContent className="p-7">
            <p className="text-xs font-bold uppercase tracking-widest mb-7" style={{ color: TEAL }}>Parâmetros</p>

            <SliderParam label="Folha Salarial Base"
              tooltip="Valor total da folha de pagamento mensal dos colaboradores, excluindo as premiações."
              value={salario} min={10000} max={1000000} step={5000}
              onChange={setSalario} display={fmtBRL(salario)} />

            <SliderParam label="Valor de Prêmios"
              tooltip="Premiações não integram salário conforme Art. 457 §2º da CLT (Lei 13.467/2017). Via BluePay, incidem apenas a taxa de serviço — sem encargos previdenciários."
              value={premios} min={0} max={500000} step={5000}
              onChange={setPremios} display={fmtBRL(premios)} />

            <SliderParam label="Encargos Trabalhistas"
              tooltip="Soma de FGTS (8%), INSS patronal (~20%), Férias (11,11%), 13º Salário (8,33%) e outros encargos sociais. Padrão de mercado: ~60%."
              value={encargos} min={40} max={80} step={1}
              onChange={setEncargos} display={`${encargos.toFixed(1).replace('.', ',')}%`} />

            <div className="mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1 mb-2">
                Investimento BluePay
                <span title="Investimento na plataforma BluePay para estruturar a remuneração de forma inteligente."
                  className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center cursor-help select-none hover:bg-teal-50">
                  ?
                </span>
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 px-3 py-2.5 gap-2 focus-within:border-[#0097A7] focus-within:ring-2 focus-within:ring-[#0097A7]/20 transition-all">
                <input type="text" value={taxaBPStr}
                       onChange={(e) => setTaxaBPStr(e.target.value)}
                       className="flex-1 text-right font-bold bg-transparent outline-none text-sm min-w-0"
                       style={{ color: TEAL }} />
                <span className="text-sm font-medium shrink-0 select-none" style={{ color: TEAL }}>%</span>
              </div>
            </div>

            <div className="mt-7 rounded-xl p-4 text-xs leading-relaxed" style={{ background: 'rgba(109,207,224,0.08)', border: '1px solid rgba(109,207,224,0.25)', color: '#595959' }}>
              <strong style={{ color: TEAL }}>Como funciona:</strong> No Cenário I, os prêmios são tratados como salário e sofrem todos os encargos trabalhistas. No Cenário II, os prêmios são estruturados via BluePay, com apenas o investimento na plataforma.
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* KPI hero */}
          <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)` }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Economia Anual com BluePay</p>
            <p className="text-4xl font-black leading-none tracking-tight">{fmtBRL(d.econAnual)}</p>
            <p className="text-xs mt-2 opacity-70">reinvestidos no crescimento do seu negócio</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Custo CLT</p>
              <p className="text-lg font-bold mt-1 text-red-500">{fmtBRL(d.cenI)}</p>
              <p className="text-xs text-gray-400 mt-1">com todos encargos</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Investimento BluePay</p>
              <p className="text-lg font-bold mt-1" style={{ color: TEAL }}>{fmtBRL(d.cenII)}</p>
              <p className="text-xs text-gray-400 mt-1">com remuneração inteligente</p>
            </CardContent></Card>
            <Card className="border-2" style={{ borderColor: 'rgba(109,207,224,0.4)' }}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TEAL }}>Economia Mensal</p>
                <p className="text-lg font-bold mt-1" style={{ color: TEAL }}>{fmtBRL(d.econMensal)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="flex-1">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-5 text-gray-400">Comparativo de Custos</p>
              <Bar data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
        </div>
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
