import { gerarAvisosEsquecidas, responsaveisComAvisoVencido } from '../services/kanban.service';
import { salaUsuario, sincronizarSalas } from './sync';

const INTERVALO_MS = 60_000;

/**
 * Job dos lembretes e prazos do Kanban. Eles vencem com o tempo (não por uma
 * ação de alguém), então sem este job cada aba precisaria perguntar a cada
 * minuto. Aqui é uma consulta por minuto no servidor, e só quem tem algo
 * vencendo recebe o aviso para buscar /api/kanban/notificacoes.
 * Tarefas esquecidas (paradas há dias) têm o aviso gerado aqui mesmo, porque
 * também avisam o solicitante — não só o responsável.
 */
export function iniciarLembretesKanban(): void {
  setInterval(() => {
    Promise.all([responsaveisComAvisoVencido(), gerarAvisosEsquecidas()])
      .then(([vencendo, esquecidas]) => {
        const ids = [...new Set([...vencendo, ...esquecidas])];
        if (ids.length) sincronizarSalas(ids.map(salaUsuario), 'kanban');
      })
      .catch((err) => console.error('[lembretes-kanban] falha na verificação:', err));
  }, INTERVALO_MS).unref();
}
