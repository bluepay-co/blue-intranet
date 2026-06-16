import axios from 'axios';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DadosChamadoSlack {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  criticidade: string;
  status: string;
  autorNome: string;
}

// ─── Mapeamentos ──────────────────────────────────────────────────────────────

const COR_CRITICIDADE: Record<string, string> = {
  CRITICO: '#C0392B',
  ALTO:    '#E67E22',
  MEDIO:   '#F1C40F',
  BAIXO:   '#27AE60',
};

const LABEL_CRITICIDADE: Record<string, string> = {
  CRITICO: 'Crítico',
  ALTO:    'Alto',
  MEDIO:   'Médio',
  BAIXO:   'Baixo',
};

const LABEL_STATUS: Record<string, string> = {
  ABERTO:       'Em aberto',
  EM_ANDAMENTO: 'Em andamento',
  FECHADO:      'Encerrado',
};

const LABEL_CATEGORIA: Record<string, string> = {
  IMPRESSORA:  'Impressora',
  COMPUTADOR:  'Computador',
  REDE:        'Rede',
  ACESSOS:     'Acessos',
  OUTROS:      'Outros',
  BUG:         'Bug',
  MELHORIA:    'Melhoria',
  DUVIDA:      'Dúvida',
  INTEGRACAO:  'Integração',
};

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildPayloadNovoChamado(c: DadosChamadoSlack, frontendUrl: string): object {
  const cor        = COR_CRITICIDADE[c.criticidade]  ?? '#95A5A6';
  const criticidade = LABEL_CRITICIDADE[c.criticidade] ?? c.criticidade;
  const status      = LABEL_STATUS[c.status]            ?? c.status;
  const categoria   = LABEL_CATEGORIA[c.categoria]      ?? c.categoria;
  const linkChamado = frontendUrl ? `${frontendUrl}/chamados/${c.id}` : null;

  const preview = c.descricao.length > 140
    ? c.descricao.slice(0, 140).trimEnd() + '…'
    : c.descricao;

  const ts = Math.floor(Date.now() / 1000);

  return {
    text: `Chamado #${c.id}: ${c.titulo}`,
    attachments: [
      {
        color: cor,
        blocks: [
          // Título do card
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Novo chamado aberto — #${c.id}*`,
            },
          },
          { type: 'divider' },
          // Título + preview da descrição
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${c.titulo}*\n${preview}`,
            },
          },
          // Metadados em grade
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Categoria*\n${categoria}` },
              { type: 'mrkdwn', text: `*Criticidade*\n${criticidade}` },
              { type: 'mrkdwn', text: `*Status*\n${status}` },
              { type: 'mrkdwn', text: `*Solicitante*\n${c.autorNome}` },
            ],
          },
          // Botão de acesso direto (apenas se FRONTEND_URL estiver configurado)
          ...(linkChamado ? [{
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Ver chamado', emoji: false },
                url: linkChamado,
                style: 'primary',
              },
            ],
          }] : []),
          { type: 'divider' },
          // Rodapé
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Blue Intranet  ·  <!date^${ts}^{date_short_pretty} às {time}|agora>`,
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── Função pública ───────────────────────────────────────────────────────────

export function notificarNovoChamado(chamado: DadosChamadoSlack, webhookEnvVar = 'SLACK_WEBHOOK_CHAMADOS'): void {
  const webhookUrl  = process.env[webhookEnvVar];
  const frontendUrl = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '');

  if (!webhookUrl) {
    console.warn(`[Slack] Variável ${webhookEnvVar} não encontrada no .env — notificação ignorada.`);
    return;
  }
  console.log(`[Slack] Enviando notificação via ${webhookEnvVar} para chamado #${chamado.id}`);

  axios
    .post(webhookUrl, buildPayloadNovoChamado(chamado, frontendUrl))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Slack] Falha ao notificar novo chamado (${webhookEnvVar}):`, msg);
    });
}
