import { Router } from 'express';
import { authRouter } from './auth.routes';
import { agendaRouter } from './agenda.routes';
import { tarefasRouter } from './tarefas.routes';
import { blogRouter } from './blog.routes';
import { usuarioRouter } from './usuario.routes';
import { chamadosRouter } from './chamado.routes';
import { metricasRouter } from './metricas.routes';
import { prevendasRouter } from './prevendas.routes';
import { clienteRouter } from './cliente.routes';
import { carteiraRouter } from './carteira.routes';
import { backofficeRouter } from './backoffice.routes';
import { chatRouter } from './chat.routes';
import { gerenteRouter } from './gerente.routes';
import { atualizacaoRouter } from './atualizacao.routes';
import { blueloverRouter } from './bluelover.routes';

const router = Router();


// Domínio: Autenticação (Google Workspace + JWT)
router.use('/api/auth', authRouter);

// Domínio: Agenda (Google Calendar do usuário logado)
router.use('/api/agenda', agendaRouter);

// Domínio: Tarefas (Google Tasks do usuário logado)
router.use('/api/tarefas', tarefasRouter);

// Domínio: Blog de Marketing (feed público + admin exclusivo MARKETING)
router.use('/api/blog', blogRouter);

// Domínio: Bluelovers (perfis do time — vitrine para todos, gestão pelo MARKETING)
router.use('/api/bluelovers', blueloverRouter);

// Domínio: Usuários (gestão de acessos e cargos — exclusivo T.I)
router.use('/api/usuarios', usuarioRouter);

// Domínio: Chamados (help desk de T.I. — abertura por todos, gestão pela T.I.)
router.use('/api/chamados', chamadosRouter);

// Domínio: Métricas de Vendas (vendedores — banco bluepay3_production, somente leitura)
router.use('/api/metricas', metricasRouter);

// Domínio: Pré-Vendas (SDRs — atividades lançadas na intranet, tabelas pv_*)
router.use('/api/prevendas', prevendasRouter);

// Domínio: Clientes do vendedor (bluepay3_production, somente leitura, escopo por manager_id)
router.use('/api/clientes', clienteRouter);

// Domínio: Carteira (inteligência — radar de risco e cross-sell, escopo por manager_id)
router.use('/api/carteira', carteiraRouter);

// Domínio: Chamados de Infra via BluePay Backoffice (API externa, proxy seguro)
router.use('/api/backoffice/chamados', backofficeRouter);

// Domínio: Chat interno (canais de setor/DM/customizados, mensagens em tempo real)
router.use('/api/chat', chatRouter);

// Domínio: Gerência (visão de equipe para os cargos GERENTE_*, escopo por role)
router.use('/api/gerente', gerenteRouter);

// Domínio: Atualizações da intranet (avisos criados pelo T.I. — card modal para todos)
router.use('/api/atualizacoes', atualizacaoRouter);

export { router };