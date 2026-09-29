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
    // allSettled: uma verificação falhando (ex.: migration ainda não aplicada)
    // não pode derrubar a outra — lembretes e prazos seguem funcionando.
    Promise.allSettled([responsaveisComAvisoVencido(), gerarAvisosEsquecidas()]).then((resultados) => {
      const ids = new Set<number>();
      resultados.forEach((r, i) => {
        if (r.status === 'fulfilled') r.value.forEach((id) => ids.add(id));
        else console.error(`[lembretes-kanban] falha em ${i === 0 ? 'lembretes/prazos' : 'tarefas esquecidas'}:`, r.reason);
      });
      if (ids.size) sincronizarSalas([...ids].map(salaUsuario), 'kanban');
    });
  }, INTERVALO_MS).unref();
}
