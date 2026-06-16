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

// ─── Ícones (icons8 — imagens públicas, sem emoji) ────────────────────────────

const ICONE_CATEGORIA: Record<string, string> = {
  IMPRESSORA: 'https://img.icons8.com/color/48/printer.png',
  COMPUTADOR: 'https://img.icons8.com/color/48/laptop.png',
  REDE:       'https://img.icons8.com/color/48/network.png',
  ACESSOS:    'https://img.icons8.com/color/48/key.png',
  OUTROS:     'https://img.icons8.com/color/48/maintenance.png',
};

const ICONE_CRITICIDADE: Record<string, string> = {
  CRITICO: 'https://img.icons8.com/color/48/high-importance.png',
  ALTO:    'https://img.icons8.com/color/48/important.png',
  MEDIO:   'https://img.icons8.com/color/48/medium-importance.png',
  BAIXO:   'https://img.icons8.com/color/48/low-importance.png',
};

const ICONE_STATUS: Record<string, string> = {
  ABERTO:       'https://img.icons8.com/color/48/new-post.png',
  EM_ANDAMENTO: 'https://img.icons8.com/color/48/in-progress.png',
  FECHADO:      'https://img.icons8.com/color/48/ok.png',
};

// ─── Labels ───────────────────────────────────────────────────────────────────

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
  IMPRESSORA: 'Impressora',
  COMPUTADOR: 'Computador',
  REDE:       'Rede',
  ACESSOS:    'Acessos',
  OUTROS:     'Outros',
};

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildPayloadNovoChamado(c: DadosChamadoSlack, frontendUrl: string): object {
  const cor         = COR_CRITICIDADE[c.criticidade]  ?? '#95A5A6';
  const criticidade = LABEL_CRITICIDADE[c.criticidade] ?? c.criticidade;
  const status      = LABEL_STATUS[c.status]            ?? c.status;
  const categoria   = LABEL_CATEGORIA[c.categoria]      ?? c.categoria;
  const linkChamado = frontendUrl ? `${frontendUrl}/chamados/${c.id}` : null;

  const preview = c.descricao.length > 140
    ? c.descricao.slice(0, 140).trimEnd() + '…'
    : c.descricao;

  const ts = Math.floor(Date.now() / 1000);

  return {
    username: 'Blue Intranet',
    icon_url: 'https://img.icons8.com/color/96/technical-support.png',
    text: `Novo chamado #${c.id}: ${c.titulo}`,
    attachments: [
      {
        color: cor,
        blocks: [
          // Cabeçalho com ícone de suporte como accessory
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Novo chamado aberto — #${c.id}*`,
            },
            accessory: {
              type: 'image',
              image_url: ICONE_CATEGORIA[c.categoria] ?? 'https://img.icons8.com/color/48/maintenance.png',
              alt_text: categoria,
            },
          },
          { type: 'divider' },
          // Título e descrição
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${c.titulo}*\n${preview}`,
            },
          },
          // Grade de metadados — texto limpo sem emoji
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Categoria*\n${categoria}` },
              { type: 'mrkdwn', text: `*Criticidade*\n${criticidade}` },
              { type: 'mrkdwn', text: `*Status*\n${status}` },
              { type: 'mrkdwn', text: `*Solicitante*\n${c.autorNome}` },
            ],
          },
          // Context bar com ícones reais inline
          {
            type: 'context',
            elements: [
              {
                type: 'image',
                image_url: ICONE_CRITICIDADE[c.criticidade] ?? 'https://img.icons8.com/color/48/medium-importance.png',
                alt_text: criticidade,
              },
              { type: 'mrkdwn', text: criticidade },
              {
                type: 'image',
                image_url: ICONE_STATUS[c.status] ?? 'https://img.icons8.com/color/48/new-post.png',
                alt_text: status,
              },
              { type: 'mrkdwn', text: status },
            ],
          },
          // Botão de acesso direto
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
                type: 'image',
                image_url: 'https://img.icons8.com/color/48/technical-support.png',
                alt_text: 'Blue Intranet',
              },
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

export function notificarNovoChamado(chamado: DadosChamadoSlack): void {
  const webhookUrl  = process.env.SLACK_WEBHOOK_URL;
  const frontendUrl = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '');

  if (!webhookUrl) return;

  axios
    .post(webhookUrl, buildPayloadNovoChamado(chamado, frontendUrl))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Slack] Falha ao notificar novo chamado:', msg);
    });
}
