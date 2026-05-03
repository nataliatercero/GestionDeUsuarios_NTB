import nodemailer from 'nodemailer';

// En test no enviamos emails reales para no depender de credenciales SMTP
const IS_TEST = process.env.NODE_ENV === 'test';

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const FROM = process.env.SMTP_FROM || 'BildyApp <no-reply@bildy.app>';

export const sendVerificationEmail = async (email, code) => {
  if (IS_TEST) return;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verifica tu cuenta en BildyApp',
    html: `
      <h2>Bienvenido a BildyApp</h2>
      <p>Tu código de verificación es:</p>
      <h1 style="letter-spacing: 8px; font-family: monospace;">${code}</h1>
      <p>Este código expira una vez que hayas verificado tu cuenta.</p>
      <p>Si no has solicitado este registro, ignora este correo.</p>
    `,
  });
};

export const sendInvitationEmail = async (email, inviteeName, companyName, tempPassword) => {
  if (IS_TEST) return;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Has sido invitado a ${companyName} en BildyApp`,
    html: `
      <h2>Hola, ${inviteeName}</h2>
      <p>Has sido invitado a unirte a <strong>${companyName}</strong> en BildyApp.</p>
      <p>Tus credenciales de acceso son:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Contraseña temporal:</strong> ${tempPassword}</li>
      </ul>
      <p>Te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
    `,
  });
};
