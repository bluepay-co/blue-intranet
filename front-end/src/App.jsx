import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/components/Login'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { KANBAN_ROLES } from '@/api/modules/kanban'
import { lazyComRecarga } from '@/lib/lazyComRecarga'

// Páginas carregadas sob demanda (um chunk por rota) — o bundle inicial fica leve.
const Agenda = lazyComRecarga(() => import('@/pages/Agenda'))
const Chat = lazyComRecarga(() => import('@/pages/Chat'))
const Tarefas = lazyComRecarga(() => import('@/pages/Tarefas'))
const KanbanEquipe = lazyComRecarga(() => import('@/pages/KanbanEquipe'))
const Usuarios = lazyComRecarga(() => import('@/pages/Usuarios'))
const Blog = lazyComRecarga(() => import('@/pages/Blog'))
const AdminBlog = lazyComRecarga(() => import('@/pages/marketing/AdminBlog'))
const BlogPublicados = lazyComRecarga(() => import('@/pages/marketing/blog/BlogPublicados'))
const BlogRascunhos = lazyComRecarga(() => import('@/pages/marketing/blog/BlogRascunhos'))
const Formularios = lazyComRecarga(() => import('@/pages/marketing/Formularios'))
const FormularioEditor = lazyComRecarga(() => import('@/pages/marketing/FormularioEditor'))
const FormularioRespostas = lazyComRecarga(() => import('@/pages/marketing/FormularioRespostas'))
const Bluelovers = lazyComRecarga(() => import('@/pages/Bluelovers'))
const BlueloverPerfil = lazyComRecarga(() => import('@/pages/BlueloverPerfil'))
const AdminBluelovers = lazyComRecarga(() => import('@/pages/marketing/AdminBluelovers'))
const BlueloverEditor = lazyComRecarga(() => import('@/pages/marketing/BlueloverEditor'))
const Chamados = lazyComRecarga(() => import('@/pages/Chamados'))
const ChamadoDetalhe = lazyComRecarga(() => import('@/pages/ChamadoDetalhe'))
const ChamadosTI = lazyComRecarga(() => import('@/pages/ti/ChamadosTI'))
const DashboardTI = lazyComRecarga(() => import('@/pages/ti/DashboardTI'))
const Atualizacoes = lazyComRecarga(() => import('@/pages/ti/Atualizacoes'))
const ChamadosProdutos = lazyComRecarga(() => import('@/pages/produtos/ChamadosProdutos'))
const DashboardPessoal = lazyComRecarga(() => import('@/pages/metricas/DashboardPessoal'))
const ForecastPessoal = lazyComRecarga(() => import('@/pages/metricas/ForecastPessoal'))
const DashboardEquipe = lazyComRecarga(() => import('@/pages/metricas/DashboardEquipe'))
const DashboardGeral = lazyComRecarga(() => import('@/pages/metricas/DashboardGeral'))
const DashboardComercialLayout = lazyComRecarga(() => import('@/pages/metricas/DashboardComercialLayout'))
const DashboardVisaoGeral = lazyComRecarga(() => import('@/pages/metricas/DashboardVisaoGeral'))
const DashboardPreVendas = lazyComRecarga(() => import('@/pages/metricas/DashboardPreVendas'))
const DashboardPreVendasEquipe = lazyComRecarga(() => import('@/pages/metricas/DashboardPreVendasEquipe'))
const LancamentoPreVendas = lazyComRecarga(() => import('@/pages/prevendas/LancamentoPreVendas'))
const ClientesLayout = lazyComRecarga(() => import('@/pages/clientes/ClientesLayout'))
const MeusClientes = lazyComRecarga(() => import('@/pages/clientes/MeusClientes'))
const Prospeccao = lazyComRecarga(() => import('@/pages/clientes/Prospeccao'))
const GrupoEconomico = lazyComRecarga(() => import('@/pages/clientes/GrupoEconomico'))
const ClienteDetalheLayout = lazyComRecarga(() => import('@/pages/clientes/ClienteDetalheLayout'))
const ClienteDetalhe = lazyComRecarga(() => import('@/pages/clientes/ClienteDetalhe'))
const ClienteDetalheMes = lazyComRecarga(() => import('@/pages/clientes/ClienteDetalheMes'))
const RadarRisco = lazyComRecarga(() => import('@/pages/carteira/RadarRisco'))
const CrossSell = lazyComRecarga(() => import('@/pages/carteira/CrossSell'))
const ClientesDaEquipe = lazyComRecarga(() => import('@/pages/gerente/ClientesDaEquipe'))
const ClienteEquipeDetalhe = lazyComRecarga(() => import('@/pages/gerente/ClienteEquipeDetalhe'))
const ReceitasEquipe = lazyComRecarga(() => import('@/pages/gerente/ReceitasEquipe'))
const VisaoEquipePessoal = lazyComRecarga(() => import('@/pages/gerente/VisaoEquipePessoal'))
const ForecastIS = lazyComRecarga(() => import('@/pages/gerente/ForecastIS'))

function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Área autenticada (casca com sidebar) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/metricas/comercial" replace />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="chat" element={<Chat />} />
        <Route path="tarefas" element={<Tarefas />} />
        <Route
          path="kanban"
          element={
            <ProtectedRoute roles={KANBAN_ROLES}>
              <KanbanEquipe />
            </ProtectedRoute>
          }
        />
        <Route path="blog" element={<Blog />} />
        <Route path="bluelovers" element={<Bluelovers />} />
        <Route path="bluelovers/:id" element={<BlueloverPerfil />} />
        <Route path="chamados" element={<Chamados />} />
        <Route path="chamados/cx/:id" element={<ChamadoDetalhe fonte="cx" />} />
        <Route path="chamados/:id" element={<ChamadoDetalhe />} />
        <Route
          path="ti/dashboard"
          element={
            <ProtectedRoute roles={['TI', 'DESENVOLVEDOR']}>
              <DashboardTI />
            </ProtectedRoute>
          }
        />
        <Route
          path="ti/chamados"
          element={
            <ProtectedRoute roles={['TI', 'DESENVOLVEDOR']}>
              <ChamadosTI />
            </ProtectedRoute>
          }
        />
        <Route
          path="ti/atualizacoes"
          element={
            <ProtectedRoute roles={['TI', 'DESENVOLVEDOR']}>
              <Atualizacoes />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing/admin"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <AdminBlog />
            </ProtectedRoute>
          }
        >
          <Route index element={<BlogPublicados />} />
          <Route path="rascunhos" element={<BlogRascunhos />} />
        </Route>
        <Route
          path="marketing/formularios"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <Formularios />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing/formularios/novo"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <FormularioEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing/formularios/:id"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <FormularioEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing/formularios/:id/respostas"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <FormularioRespostas />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing/bluelovers"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <AdminBluelovers />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing/bluelovers/:id"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <BlueloverEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="produtos/chamados"
          element={
            <ProtectedRoute roles={['PRODUTOS', 'DESENVOLVEDOR']}>
              <ChamadosProdutos />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute roles={['TI', 'DESENVOLVEDOR']}>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        {/* Redirect de compatibilidade */}
        <Route path="metricas/geral" element={<Navigate to="/metricas/comercial" replace />} />

        {/* Dashboard Comercial com abas: Geral | IS | KAM — visível para todos */}
        <Route
          path="metricas/comercial"
          element={
            <ProtectedRoute>
              <DashboardComercialLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardGeral />} />
          <Route path="is"  element={<DashboardEquipe equipeFixa="IS" />} />
          <Route path="kam" element={<DashboardEquipe equipeFixa="KAM" />} />
        </Route>

        <Route
          path="metricas/pessoal"
          element={
            <ProtectedRoute roles={['VENDAS', 'KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <DashboardPessoal />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/visao-geral"
          element={
            <ProtectedRoute roles={['KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <DashboardVisaoGeral />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/forecast"
          element={
            <ProtectedRoute roles={['KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <ForecastPessoal />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/is/equipe"
          element={
            <ProtectedRoute roles={['INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <DashboardEquipe />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/kam/equipe"
          element={
            <ProtectedRoute roles={['KAM', 'DESENVOLVEDOR']}>
              <DashboardEquipe />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/prevendas"
          element={
            <ProtectedRoute roles={['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR']}>
              <DashboardPreVendas />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/prevendas/equipe"
          element={
            <ProtectedRoute roles={['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR']}>
              <DashboardPreVendasEquipe />
            </ProtectedRoute>
          }
        />
        <Route
          path="prevendas/lancamento"
          element={
            <ProtectedRoute roles={['PRE_VENDAS', 'DIRETORIA', 'DESENVOLVEDOR']}>
              <LancamentoPreVendas />
            </ProtectedRoute>
          }
        />
        <Route
          path="clientes"
          element={
            <ProtectedRoute roles={['KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <ClientesLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MeusClientes />} />
          <Route path="prospeccao" element={<Prospeccao />} />
          <Route path="grupo-economico" element={<GrupoEconomico />} />
        </Route>
        <Route
          path="clientes/:id"
          element={
            <ProtectedRoute roles={['KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <ClienteDetalheLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ClienteDetalhe />} />
          <Route path="mes" element={<ClienteDetalheMes />} />
        </Route>
        <Route
          path="carteira/risco"
          element={
            <ProtectedRoute roles={['KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <RadarRisco />
            </ProtectedRoute>
          }
        />
        <Route
          path="carteira/cross-sell"
          element={
            <ProtectedRoute roles={['KAM', 'INSIGHT_SALES', 'DESENVOLVEDOR']}>
              <CrossSell />
            </ProtectedRoute>
          }
        />

        {/* Gerência — Inside Sales & CX */}
        <Route
          path="gerente/is/visao-geral"
          element={
            <ProtectedRoute roles={['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <DashboardEquipe equipeFixa="IS" titulo="Insight Sales" mostrarSigilosas />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/is/clientes"
          element={
            <ProtectedRoute roles={['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ClientesDaEquipe />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/is/clientes/:id"
          element={
            <ProtectedRoute roles={['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ClienteEquipeDetalhe />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/is/receitas"
          element={
            <ProtectedRoute roles={['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ReceitasEquipe />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/is/equipe-pessoal"
          element={
            <ProtectedRoute roles={['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <VisaoEquipePessoal />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/is/forecast"
          element={
            <ProtectedRoute roles={['GERENTE_INSIDE_CX', 'GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ForecastIS />
            </ProtectedRoute>
          }
        />

        {/* Gerência — Comercial (KAM): mesmas telas do IS, escopadas ao time KAM */}
        <Route
          path="gerente/kam/visao-geral"
          element={
            <ProtectedRoute roles={['GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <DashboardEquipe equipeFixa="KAM" titulo="KAM" mostrarSigilosas />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/kam/clientes"
          element={
            <ProtectedRoute roles={['GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ClientesDaEquipe equipe="KAM" />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/kam/clientes/:id"
          element={
            <ProtectedRoute roles={['GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ClienteEquipeDetalhe equipe="KAM" />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/kam/receitas"
          element={
            <ProtectedRoute roles={['GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ReceitasEquipe equipe="KAM" />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/kam/equipe-pessoal"
          element={
            <ProtectedRoute roles={['GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <VisaoEquipePessoal equipe="KAM" />
            </ProtectedRoute>
          }
        />
        <Route
          path="gerente/kam/forecast"
          element={
            <ProtectedRoute roles={['GERENTE_COMERCIAL', 'DESENVOLVEDOR']}>
              <ForecastIS equipe="KAM" />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Qualquer outra rota cai na home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
