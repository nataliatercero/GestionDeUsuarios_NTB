import { IncomingWebhook } from '@slack/webhook';

const webhook = process.env.SLACK_WEBHOOK
  ? new IncomingWebhook(process.env.SLACK_WEBHOOK)
  : null;

// Envío genérico a Slack
export const sendSlackNotification = async (text) => {
  if (!webhook) return;
  try {
    await webhook.send({ text });
  } catch (err) {
    console.error('[Slack] Error al enviar notificación:', err.message);
  }
};

// Solo para errores 5XX 
export const notifySlack5xxError = (req, err) => {
  if (!webhook) return;

  const method  = req?.method       ?? 'UNKNOWN';
  const path    = req?.originalUrl  ?? 'UNKNOWN';
  const status  = err?.statusCode   ?? 500;
  const message = err?.message      ?? 'Error inesperado';
  const stack   = process.env.NODE_ENV !== 'production' && err?.stack
    ? `\n\`\`\`${err.stack.slice(0, 600)}\`\`\``
    : '';

  webhook.send({
    text: [
      `🚨 *Error ${status} en la API*`,
      `*Endpoint:* \`${method} ${path}\``,
      `*Mensaje:* ${message}${stack}`,
    ].join('\n'),
  }).catch(slackErr => console.error('[Slack] Error al enviar 5XX:', slackErr.message));
};

// Stream para morgan-body 
export const loggerStream = {
  write: (message) => console.error(message.trimEnd()),
};
