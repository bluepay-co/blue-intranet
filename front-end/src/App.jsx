import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/components/Login'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Dashboard from '@/pages/Dashboard'
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
        <Route index element={<Dashboard />} />
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
      </Route>

      {/* Qualquer outra rota cai na home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
