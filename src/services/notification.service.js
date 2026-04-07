import { EventEmitter } from 'node:events';

class NotificationService extends EventEmitter {}

const notificationService = new NotificationService();

// CONFIGURACIÓN DE LISTENERS
// Estos escuchan los eventos y hacen el log por consola.

notificationService.on('user:registered', (user) => {
  console.log(`[EVENT] Registro: Nuevo usuario creado -> ${user.email}`);
});

notificationService.on('user:verified', (user) => {
  console.log(`[EVENT] Verificación: El usuario ${user.email} ya es "verified"`);
});

notificationService.on('company:created', (data) => {
  console.log(`[EVENT] Empresa: ${data.name} (CIF: ${data.cif}) creada por ${data.fullName}`);
});

notificationService.on('company:joined', (data) => {
  console.log(`[EVENT] Empresa: ${data.fullName} se ha unido a la empresa ${data.cif}`);
});

notificationService.on('user:deleted', (data) => {
  const typeMsg = data.type === 'soft' ? 'Borrado Lógico (Desactivado)' : 'Borrado Físico (Eliminado)';
  console.log(`[EVENT] Usuario Eliminado [${typeMsg}]: ${data.email}`);
});

notificationService.on('user:invited', (data) => {
  console.log(`[EVENT] ✉️  ${data.adminName} ha invitado a ${data.guestName} a la empresa "${data.companyName}" (${data.email})`);
});

export default notificationService;