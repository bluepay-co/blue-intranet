import axios from 'axios';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DadosChamadoSlack {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  criticidade: string;
  status: string;
  autorNome: string;
}

// ─── Mapeamentos visuais ──────────────────────────────────────────────────────

const COR_CRITICIDADE: Record<string, string> = {
  CRITICO: '#E63946',
  ALTO:    '#F4511E',
  MEDIO:   '#F9A825',
  BAIXO:   '#00897B',
};

const EMOJI_CRITICIDADE: Record<string, string> = {
  CRITICO: ':rotating_light:',
  ALTO:    ':red_circle:',
  MEDIO:   ':large_yellow_circle:',
  BAIXO:   ':large_green_circle:',
};

const EMOJI_STATUS: Record<string, string> = {
  ABERTO:       ':white_circle:',
  EM_ANDAMENTO: ':large_blue_circle:',
  FECHADO:      ':white_check_mark:',
};

const EMOJI_CATEGORIA: Record<string, string> = {
  IMPRESSORA:  ':printer:',
  COMPUTADOR:  ':computer:',
  REDE:        ':globe_with_meridians:',
  ACESSOS:     ':key:',
  OUTROS:      ':wrench:',
};

// ─── Builder de payload ───────────────────────────────────────────────────────

function buildPayloadNovoChamado(c: DadosChamadoSlack): object {
  const cor        = COR_CRITICIDADE[c.criticidade]  ?? '#95A5A6';
  const emojiCrit  = EMOJI_CRITICIDADE[c.criticidade] ?? ':white_circle:';
  const emojiStat  = EMOJI_STATUS[c.status]            ?? ':white_circle:';
  const emojiCat   = EMOJI_CATEGORIA[c.categoria]      ?? ':wrench:';

  const preview = c.descricao.length > 120
    ? c.descricao.slice(0, 120).trimEnd() + '…'
    : c.descricao;

  return {
    text: `Novo chamado #${c.id}: ${c.titulo}`,
    attachments: [
      {
        color: cor,
        blocks: [
          // Cabeçalho
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:ticket: *Novo Chamado Aberto — #${c.id}*`,
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
          // Grade de metadados
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Categoria*\n${emojiCat}  ${c.categoria}`,
              },
              {
                type: 'mrkdwn',
                text: `*Criticidade*\n${emojiCrit}  ${c.criticidade}`,
              },
              {
                type: 'mrkdwn',
                text: `*Status*\n${emojiStat}  ${c.status.replace('_', ' ')}`,
              },
              {
                type: 'mrkdwn',
                text: `*Aberto por*\n:bust_in_silhouette:  ${c.autorNome}`,
              },
            ],
          },
          { type: 'divider' },
          // Rodapé
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `:blue_intranet: *Blue Intranet* · Sistema de Help Desk · <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} às {time}|agora>`,
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── Função pública ───────────────────────────────────────────────────────────

export function notificarNovoChamado(chamado: DadosChamadoSlack): void {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  axios
    .post(webhookUrl, buildPayloadNovoChamado(chamado))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Slack] Falha ao notificar novo chamado:', msg);
    });
}
