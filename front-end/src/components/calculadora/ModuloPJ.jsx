import { useState, useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import { Card, CardContent } from '@/components/ui/card'
import { fmtBRL, parseMoney, fmtPct, sliderClass } from './calc-utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const TEAL = '#0097A7'
const TEAL_LIGHT = '#6DCFE0'
const NAVY = '#091A24'

function calcMod3(s) {
  const valorNF     = s.total * (1 - s.perc)
  const valorPremio = s.total * s.perc
  const imposto1    = s.total  * s.ir
  const liqI        = s.total  * (1 - s.ir)
  const imposto2    = valorNF  * s.ir + valorPremio * s.taxaBP
  const liqII       = valorNF  * (1 - s.ir) + valorPremio * (1 - s.taxaBP)
  return { valorNF, valorPremio, liqI, liqII, imposto1, imposto2, ganho: liqII - liqI }
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

export default function ModuloPJ() {
  const [total, setTotal] = useState(100000)
  const [perc, setPerc]   = useState(30)
  const [ir, setIr]       = useState(12)
  const [taxaBPStr, setTaxaBPStr] = useState('10,0')

  const taxaBP = parseMoney(taxaBPStr.replace(',', '.')) / 100

  const d = useMemo(
    () => calcMod3({ total, perc: perc / 100, ir: ir / 100, taxaBP }),
    [total, perc, ir, taxaBP],
  )

  const chartData = {
    labels: ['Cenário I — 100% NF', 'Cenário II — NF + BluePay'],
    datasets: [
      { label: 'Líquido para o PJ', data: [d.liqI, d.liqII],
        backgroundColor: ['#595959', TEAL], borderRadius: 5 },
      { label: 'Encargos / Investimento BP', data: [d.imposto1, d.imposto2],
        backgroundColor: ['#FCA5A5', TEAL_LIGHT], borderRadius: 5 },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Montserrat', size: 11 }, padding: 14 } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtBRL(ctx.raw)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, ticks: { callback: (v) => fmtBRL(v), font: { size: 10 } },
           grid: { color: 'rgba(0,0,0,0.05)' } },
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
    pdf.save('calculadora-pj-parceiros.pdf')
  }

  const ganhoLabel = d.liqI > 0
    ? `${fmtPct(d.ganho / d.liqI)} a mais líquido para o parceiro`
    : ''

  return (
    <div ref={sectionRef}>
      {/* Hero info */}
      <div className="rounded-lg px-5 py-4 mb-8" style={{ borderLeft: `4px solid ${TEAL_LIGHT}`, background: 'rgba(109,207,224,0.08)' }}>
        <p className="text-sm font-semibold" style={{ color: NAVY }}>
          Dividindo o pagamento entre NF e premiação BluePay, o parceiro{' '}
          <span style={{ color: TEAL }}>recebe mais líquido</span>{' '}
          — com o mesmo custo para a sua empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Parâmetros */}
        <Card className="lg:col-span-2">
          <CardContent className="p-7">
            <p className="text-xs font-bold uppercase tracking-widest mb-7" style={{ color: TEAL }}>Parâmetros</p>

            <SliderParam label="Valor Total ao Parceiro"
              tooltip="Valor total que a empresa deseja repassar ao parceiro/prestador PJ. O custo para a empresa é idêntico nos dois cenários."
              value={total} min={10000} max={500000} step={5000}
              onChange={setTotal} display={fmtBRL(total)} />

            <SliderParam label="% via Premiação BluePay"
              tooltip="Percentual do valor total pago via premiação BluePay, sem incidência de IR na fonte. O restante permanece como Nota Fiscal."
              value={perc} min={0} max={100} step={5}
              onChange={setPerc} display={`${perc.toFixed(1).replace('.', ',')}%`} />

            <SliderParam label="Alíquota Tributária do PJ"
              tooltip="Carga sobre a Nota Fiscal do prestador PJ — IRPJ + PIS + COFINS + ISS conforme regime. A remuneração inteligente BluePay substitui parte desse custo."
              value={ir} min={6} max={20} step={0.5}
              onChange={setIr} display={`${ir.toFixed(1).replace('.', ',')}%`} />

            <div className="mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1 mb-2">
                Investimento BluePay
                <span title="Investimento BluePay sobre o valor da premiação. Inferior à carga sobre a Nota Fiscal, gerando mais líquido para o parceiro."
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

            <div className="mt-7 rounded-xl p-4 text-xs leading-relaxed" style={{ background: 'rgba(109,207,224,0.08)', border: '1px solid rgba(109,207,224,0.25)', color: '#595959' }}>
              <strong style={{ color: TEAL }}>Para a empresa:</strong> custo total equivalente nos dois cenários. O parceiro recebe <strong>mais líquido</strong> porque o investimento BluePay é inferior à carga sobre a Nota Fiscal.
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* KPI hero */}
          <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)` }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Ganho Extra para o Parceiro</p>
            <p className="text-4xl font-black leading-none tracking-tight">{fmtBRL(d.ganho)}</p>
            {ganhoLabel && <p className="text-xs mt-2 opacity-80 font-semibold">{ganhoLabel}</p>}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Líquido — 100% NF</p>
              <p className="text-lg font-bold mt-1 text-gray-600">{fmtBRL(d.liqI)}</p>
              <p className="text-xs text-gray-400 mt-1">após encargos tributários</p>
            </CardContent></Card>
            <Card className="border-2" style={{ borderColor: 'rgba(109,207,224,0.4)' }}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TEAL }}>Líquido — NF + BluePay</p>
                <p className="text-lg font-bold mt-1" style={{ color: TEAL }}>{fmtBRL(d.liqII)}</p>
                <p className="text-xs text-gray-400 mt-1">após encargos e investimento BP</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela comparativa */}
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-5 text-gray-400">Tabela Comparativa</p>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Item</th>
                    <th className="text-right pb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Cenário I</th>
                    <th className="text-right pb-3 text-xs font-bold uppercase tracking-wide" style={{ color: TEAL }}>Cenário II</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-3 text-gray-500 font-medium text-xs">Custo para a Empresa</td>
                    <td className="py-3 text-right font-bold text-gray-700 text-xs">{fmtBRL(total)}</td>
                    <td className="py-3 text-right font-bold text-gray-700 text-xs">{fmtBRL(total)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-500 font-medium text-xs">Encargos e Investimento</td>
                    <td className="py-3 text-right font-bold text-red-400 text-xs">{fmtBRL(d.imposto1)}</td>
                    <td className="py-3 text-right font-bold text-orange-400 text-xs">{fmtBRL(d.imposto2)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-xs" style={{ color: NAVY }}>Líquido para o PJ</td>
                    <td className="py-3 text-right font-black text-gray-600 text-sm">{fmtBRL(d.liqI)}</td>
                    <td className="py-3 text-right font-black text-sm" style={{ color: TEAL }}>{fmtBRL(d.liqII)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-5 text-gray-400">Comparativo Visual</p>
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
