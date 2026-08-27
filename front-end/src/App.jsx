import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/components/Login'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Agenda from '@/pages/Agenda'
import Chat from '@/pages/Chat'
import Tarefas from '@/pages/Tarefas'
import Usuarios from '@/pages/Usuarios'
import Blog from '@/pages/Blog'
import AdminBlog from '@/pages/marketing/AdminBlog'
import Bluelovers from '@/pages/Bluelovers'
import BlueloverPerfil from '@/pages/BlueloverPerfil'
import AdminBluelovers from '@/pages/marketing/AdminBluelovers'
import BlueloverEditor from '@/pages/marketing/BlueloverEditor'
import Chamados from '@/pages/Chamados'
import ChamadoDetalhe from '@/pages/ChamadoDetalhe'
import ChamadosTI from '@/pages/ti/ChamadosTI'
import DashboardTI from '@/pages/ti/DashboardTI'
import Atualizacoes from '@/pages/ti/Atualizacoes'
import ChamadosProdutos from '@/pages/produtos/ChamadosProdutos'
import DashboardPessoal from '@/pages/metricas/DashboardPessoal'
import ForecastPessoal from '@/pages/metricas/ForecastPessoal'
import DashboardEquipe from '@/pages/metricas/DashboardEquipe'
import DashboardGeral from '@/pages/metricas/DashboardGeral'
import DashboardComercialLayout from '@/pages/metricas/DashboardComercialLayout'
import DashboardVisaoGeral from '@/pages/metricas/DashboardVisaoGeral'
import DashboardPreVendas from '@/pages/metricas/DashboardPreVendas'
import DashboardPreVendasEquipe from '@/pages/metricas/DashboardPreVendasEquipe'
import LancamentoPreVendas from '@/pages/prevendas/LancamentoPreVendas'
import ClientesLayout from '@/pages/clientes/ClientesLayout'
import MeusClientes from '@/pages/clientes/MeusClientes'
import Prospeccao from '@/pages/clientes/Prospeccao'
import GrupoEconomico from '@/pages/clientes/GrupoEconomico'
import ClienteDetalheLayout from '@/pages/clientes/ClienteDetalheLayout'
import ClienteDetalhe from '@/pages/clientes/ClienteDetalhe'
import ClienteDetalheMes from '@/pages/clientes/ClienteDetalheMes'
import RadarRisco from '@/pages/carteira/RadarRisco'
import CrossSell from '@/pages/carteira/CrossSell'
import ClientesDaEquipe from '@/pages/gerente/ClientesDaEquipe'
import ClienteEquipeDetalhe from '@/pages/gerente/ClienteEquipeDetalhe'
import ReceitasEquipe from '@/pages/gerente/ReceitasEquipe'
import VisaoEquipePessoal from '@/pages/gerente/VisaoEquipePessoal'
import ForecastIS from '@/pages/gerente/ForecastIS'

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
