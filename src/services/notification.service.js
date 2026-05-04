import { EventEmitter } from 'node:events';
import { sendSlackNotification } from '../utils/handleLogger.js';

class NotificationService extends EventEmitter {}

const notificationService = new NotificationService();

notificationService.on('user:registered', (user) => {
  console.log(`[EVENT] Registro: Nuevo usuario creado -> ${user.email}`);
  sendSlackNotification(`✅ Nuevo usuario registrado: *${user.email}*`);
});

notificationService.on('user:verified', (user) => {
  console.log(`[EVENT] Verificación: El usuario ${user.email} ya es "verified"`);
});

notificationService.on('company:created', (data) => {
  console.log(`[EVENT] Empresa: ${data.companyName} (CIF: ${data.cif}) creada por ${data.userName}`);
  sendSlackNotification(`🏢 Empresa creada: *${data.companyName}* (CIF: ${data.cif}) por ${data.userName}`);
});

notificationService.on('company:joined', (data) => {
  console.log(`[EVENT] Empresa: ${data.userName} se ha unido a ${data.companyName} (${data.cif})`);
});

notificationService.on('user:deleted', (data) => {
  const typeMsg = data.type === 'soft' ? 'Borrado Lógico (Desactivado)' : 'Borrado Físico (Eliminado)';
  console.log(`[EVENT] Usuario Eliminado [${typeMsg}]: ${data.email}`);
});

notificationService.on('user:invited', (data) => {
  console.log(`[EVENT] ${data.adminName} ha invitado a ${data.guestName} a la empresa "${data.companyName}" (${data.email})`);
  sendSlackNotification(`✉️ *${data.adminName}* ha invitado a *${data.guestName}* (${data.email}) a *${data.companyName}*`);
});

export default notificationService;