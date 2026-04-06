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
  console.log(`[EVENT] Empresa: ${data.name} creada (CIF: ${data.cif}) por el usuario ${data.email}`);
});

notificationService.on('company:joined', (data) => {
  console.log(`[EVENT] Empresa: El usuario ${data.email} se ha unido a la empresa con CIF: ${data.cif}`);
});

export default notificationService;