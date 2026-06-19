import { Router } from 'express';
import { authRouter } from './auth.routes';
import { agendaRouter } from './agenda.routes';
import { tarefasRouter } from './tarefas.routes';
import { blogRouter } from './blog.routes';
import { usuarioRouter } from './usuario.routes';
import { chamadosRouter } from './chamado.routes';
import { metricasRouter } from './metricas.routes';

const router = Router();


// Domínio: Autenticação (Google Workspace + JWT)
router.use('/api/auth', authRouter);

// Domínio: Agenda (Google Calendar do usuário logado)
router.use('/api/agenda', agendaRouter);

// Domínio: Tarefas (Google Tasks do usuário logado)
router.use('/api/tarefas', tarefasRouter);

// Domínio: Blog de Marketing (feed público + admin exclusivo MARKETING)
router.use('/api/blog', blogRouter);

// Domínio: Usuários (gestão de acessos e cargos — exclusivo T.I)
router.use('/api/usuarios', usuarioRouter);

// Domínio: Chamados (help desk de T.I. — abertura por todos, gestão pela T.I.)
router.use('/api/chamados', chamadosRouter);

// Domínio: Métricas de Vendas (vendedores — banco bluepay3_production, somente leitura)
router.use('/api/metricas', metricasRouter);

export { router };