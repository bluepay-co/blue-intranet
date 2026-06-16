import axios from 'axios';

interface DadosChamado {
  id: number;
  titulo: string;
  categoria: string;
  criticidade: string;
  autorNome: string;
}

const ICONES_CRITICIDADE: Record<string, string> = {
  CRITICO: ':rotating_light:',
  ALTO: ':red_circle:',
  MEDIO: ':large_yellow_circle:',
  BAIXO: ':large_green_circle:',
};

export function notificarNovoChamado(chamado: DadosChamado): void {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const icone = ICONES_CRITICIDADE[chamado.criticidade] ?? ':ticket:';

  const payload = {
    text: `:ticket: *Novo Chamado Aberto* — #${chamado.id}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Novo Chamado #${chamado.id}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Título:*\n${chamado.titulo}` },
          { type: 'mrkdwn', text: `*Aberto por:*\n${chamado.autorNome}` },
          { type: 'mrkdwn', text: `*Categoria:*\n${chamado.categoria}` },
          { type: 'mrkdwn', text: `*Criticidade:*\n${icone} ${chamado.criticidade}` },
        ],
      },
    ],
  };

  axios.post(webhookUrl, payload).catch((err) => {
    console.error('[Slack] Falha ao enviar notificação de chamado:', err?.message ?? err);
  });
}
