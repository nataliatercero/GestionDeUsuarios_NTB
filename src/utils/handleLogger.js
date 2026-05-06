import { IncomingWebhook } from '@slack/webhook';

const webhook = process.env.SLACK_WEBHOOK && process.env.NODE_ENV !== 'test'
  ? new IncomingWebhook(process.env.SLACK_WEBHOOK)
  : null;

export const sendSlackNotification = async (text) => {
  if (!webhook) return;
  try {
    await webhook.send({ text });
  } catch (err) {
    console.error('[Slack] Error al enviar notificación:', err.message);
  }
};

export const notifySlack5xxError = (req, err) => {
  if (!webhook) return;

  const method  = req?.method       ?? 'UNKNOWN';
  const path    = req?.originalUrl  ?? 'UNKNOWN';
  const status  = err?.statusCode   ?? 500;
  const message = err?.message      ?? 'Error inesperado';
  const stack   = process.env.NODE_ENV !== 'production' && err?.stack
    ? `\n\`\`\`${err.stack.slice(0, 600)}\`\`\``
    : '';

  const timestamp = new Date().toISOString();

  webhook.send({
    text: [
      `🚨 *Error ${status} en la API*`,
      `*Timestamp:* ${timestamp}`,
      `*Endpoint:* \`${method} ${path}\``,
      `*Mensaje:* ${message}${stack}`,
    ].join('\n'),
  }).catch(slackErr => console.error('[Slack] Error al enviar 5XX:', slackErr.message));
};

export const loggerStream = {
  write: (message) => console.error(message.trimEnd()),
};
