import { useState } from 'react'
import { postReuniao, putLigacoes, STATUS_REUNIAO, VENDEDORES, SEGMENTOS } from '@/api/modules/prevendas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import { CalendarPlus, Phone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const selectCls =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function Campo({ label, children }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Aviso({ tipo, children }) {
  if (!children) return null
  const ok = tipo === 'ok'
  const Icon = ok ? CheckCircle2 : AlertCircle
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
      ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
         : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
      <Icon className="size-4 shrink-0" />
      {children}
    </div>
  )
}

export default function LancamentoPreVendas() {
  const agora = new Date()

  // ── Form: reunião ──────────────────────────────────────────────────────────
  const [reuniao, setReuniao] = useState({
    empresa: '', vendedorNome: '', segmento: '',
    ano: agora.getFullYear(), mes: agora.getMonth() + 1, semana: 1, status: 'AGENDADA',
  })
  const [salvandoReuniao, setSalvandoReuniao] = useState(false)
  const [msgReuniao, setMsgReuniao] = useState({ tipo: '', texto: '' })

  // ── Form: ligações ─────────────────────────────────────────────────────────
  const [ligacoes, setLigacoes] = useState({
    ano: agora.getFullYear(), mes: agora.getMonth() + 1, semana: 1, quantidade: 0,
  })
  const [salvandoLig, setSalvandoLig] = useState(false)
  const [msgLig, setMsgLig] = useState({ tipo: '', texto: '' })

  const setR = (campo, valor) => setReuniao((r) => ({ ...r, [campo]: valor }))
  const setL = (campo, valor) => setLigacoes((l) => ({ ...l, [campo]: valor }))

  async function enviarReuniao(e) {
    e.preventDefault()
    setMsgReuniao({ tipo: '', texto: '' })
    if (!reuniao.empresa.trim()) {
      setMsgReuniao({ tipo: 'erro', texto: 'Informe a empresa.' })
      return
    }
    setSalvandoReuniao(true)
    try {
      await postReuniao({
        ...reuniao,
        ano: Number(reuniao.ano), mes: Number(reuniao.mes), semana: Number(reuniao.semana),
      })
      setMsgReuniao({ tipo: 'ok', texto: `Reunião com "${reuniao.empresa}" registrada.` })
      setR('empresa', '')
      setR('segmento', '')
    } catch (err) {
      setMsgReuniao({ tipo: 'erro', texto: err.response?.data?.message || 'Erro ao registrar reunião.' })
    } finally {
      setSalvandoReuniao(false)
    }
  }

  async function enviarLigacoes(e) {
    e.preventDefault()
    setMsgLig({ tipo: '', texto: '' })
    setSalvandoLig(true)
    try {
      await putLigacoes({
        ano: Number(ligacoes.ano), mes: Number(ligacoes.mes),
        semana: Number(ligacoes.semana), quantidade: Number(ligacoes.quantidade),
      })
      setMsgLig({ tipo: 'ok', texto: 'Ligações da semana atualizadas.' })
    } catch (err) {
      setMsgLig({ tipo: 'erro', texto: err.response?.data?.message || 'Erro ao atualizar ligações.' })
    } finally {
      setSalvandoLig(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pré-Vendas — Lançamento"
        subtitle="Registre reuniões e ligações da semana. Os dashboards atualizam automaticamente."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Registrar reunião ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="size-4 text-primary" /> Registrar reunião
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviarReuniao} className="space-y-4">
              <Campo label="Empresa *">
                <Input value={reuniao.empresa} onChange={(e) => setR('empresa', e.target.value)} placeholder="Ex.: Matri Bank" />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Vendedor (IS/KAM)">
                  <input list="lista-vendedores" className={selectCls} value={reuniao.vendedorNome}
                    onChange={(e) => setR('vendedorNome', e.target.value)} placeholder="Opcional" />
                  <datalist id="lista-vendedores">
                    {VENDEDORES.map((v) => <option key={v} value={v} />)}
                  </datalist>
                </Campo>
                <Campo label="Segmento">
                  <input list="lista-segmentos" className={selectCls} value={reuniao.segmento}
                    onChange={(e) => setR('segmento', e.target.value)} placeholder="Opcional" />
                  <datalist id="lista-segmentos">
                    {SEGMENTOS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Status">
                  <select className={selectCls} value={reuniao.status} onChange={(e) => setR('status', e.target.value)}>
                    {STATUS_REUNIAO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Semana">
                  <select className={selectCls} value={reuniao.semana} onChange={(e) => setR('semana', e.target.value)}>
                    {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>Semana {s}</option>)}
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Mês">
                  <select className={selectCls} value={reuniao.mes} onChange={(e) => setR('mes', e.target.value)}>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Campo>
                <Campo label="Ano">
                  <Input type="number" value={reuniao.ano} onChange={(e) => setR('ano', e.target.value)} />
                </Campo>
              </div>

              <Aviso tipo={msgReuniao.tipo}>{msgReuniao.texto}</Aviso>

              <Button type="submit" disabled={salvandoReuniao} className="w-full">
                {salvandoReuniao ? <Loader2 className="size-4 animate-spin" /> : 'Registrar reunião'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Ligações da semana ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-4 text-primary" /> Ligações da semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviarLigacoes} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define o total de ligações realizadas numa semana (substitui o valor anterior daquela semana).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Mês">
                  <select className={selectCls} value={ligacoes.mes} onChange={(e) => setL('mes', e.target.value)}>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Campo>
                <Campo label="Ano">
                  <Input type="number" value={ligacoes.ano} onChange={(e) => setL('ano', e.target.value)} />
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Semana">
                  <select className={selectCls} value={ligacoes.semana} onChange={(e) => setL('semana', e.target.value)}>
                    {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>Semana {s}</option>)}
                  </select>
                </Campo>
                <Campo label="Total de ligações">
                  <Input type="number" min="0" value={ligacoes.quantidade} onChange={(e) => setL('quantidade', e.target.value)} />
                </Campo>
              </div>

              <Aviso tipo={msgLig.tipo}>{msgLig.texto}</Aviso>

              <Button type="submit" disabled={salvandoLig} className="w-full">
                {salvandoLig ? <Loader2 className="size-4 animate-spin" /> : 'Salvar ligações'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
