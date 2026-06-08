import { Router } from 'express';
import { authRouter } from './auth.routes';
import { agendaRouter } from './agenda.routes';
import { tarefasRouter } from './tarefas.routes';
import { blogRouter } from './blog.routes';

const router = Router();


// Domínio: Autenticação (Google Workspace + JWT)
router.use('/api/auth', authRouter);

// Domínio: Agenda (Google Calendar do usuário logado)
router.use('/api/agenda', agendaRouter);

// Domínio: Tarefas (Google Tasks do usuário logado)
router.use('/api/tarefas', tarefasRouter);

// Domínio: Blog de Marketing (feed público + admin exclusivo MARKETING)
router.use('/api/blog', blogRouter);

export { router };