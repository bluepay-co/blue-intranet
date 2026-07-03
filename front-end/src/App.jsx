import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/components/Login'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Agenda from '@/pages/Agenda'
import Tarefas from '@/pages/Tarefas'
import Usuarios from '@/pages/Usuarios'
import Blog from '@/pages/Blog'
import AdminBlog from '@/pages/marketing/AdminBlog'
import Chamados from '@/pages/Chamados'
import ChamadoDetalhe from '@/pages/ChamadoDetalhe'
import ChamadosTI from '@/pages/ti/ChamadosTI'
import DashboardTI from '@/pages/ti/DashboardTI'
import ChamadosCX from '@/pages/cx/ChamadosCX'
import ChamadosProdutos from '@/pages/produtos/ChamadosProdutos'
import DashboardPessoal from '@/pages/metricas/DashboardPessoal'
import DashboardEquipe from '@/pages/metricas/DashboardEquipe'
import DashboardGeral from '@/pages/metricas/DashboardGeral'
import DashboardComercialLayout from '@/pages/metricas/DashboardComercialLayout'
import DashboardCX from '@/pages/metricas/DashboardCX'
import DashboardCXEquipe from '@/pages/metricas/DashboardCXEquipe'

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
        <Route path="tarefas" element={<Tarefas />} />
        <Route path="blog" element={<Blog />} />
        <Route path="chamados" element={<Chamados />} />
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
          path="marketing/admin"
          element={
            <ProtectedRoute roles={['MARKETING', 'DESENVOLVEDOR']}>
              <AdminBlog />
            </ProtectedRoute>
          }
        />
        <Route
          path="cx/chamados"
          element={
            <ProtectedRoute roles={['CX', 'DESENVOLVEDOR']}>
              <ChamadosCX />
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
          path="metricas/cx"
          element={
            <ProtectedRoute roles={['CX', 'DESENVOLVEDOR']}>
              <DashboardCX />
            </ProtectedRoute>
          }
        />
        <Route
          path="metricas/cx/equipe"
          element={
            <ProtectedRoute roles={['CX', 'DESENVOLVEDOR']}>
              <DashboardCXEquipe />
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
