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

export default notificationService;