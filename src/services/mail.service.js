import nodemailer from 'nodemailer';

const IS_TEST = process.env.NODE_ENV === 'test';

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 2525,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const FROM = process.env.EMAIL_FROM || 'BildyApp <no-reply@bildy.app>';

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
