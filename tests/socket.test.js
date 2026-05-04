import { createServer } from 'http';
import { setupSocket, getIO } from '../src/sockets/index.js';

// No necesita servicios externos — Socket.IO funciona con un servidor HTTP en memoria

describe('sockets/index.js', () => {

  // ── Antes de cualquier setupSocket, io es null ────────────────────────────
  it('getIO devuelve null antes de llamar a setupSocket', () => {
    expect(getIO()).toBeNull();
  });

  // ── Tests que requieren setupSocket ───────────────────────────────────────
  describe('tras setupSocket', () => {
    let server;
    let io;

    beforeEach(() => {
      server = createServer();
      io = setupSocket(server);
    });

    afterEach(() => {
      io.close();
    });

    it('setupSocket devuelve una instancia de Server no nula', () => {
      expect(io).not.toBeNull();
    });

    it('getIO devuelve la misma instancia que setupSocket', () => {
      expect(getIO()).toBe(io);
    });

    it('la instancia expone los métodos on, emit y close', () => {
      expect(typeof io.on).toBe('function');
      expect(typeof io.emit).toBe('function');
      expect(typeof io.close).toBe('function');
    });

    it('setupSocket registra el listener de conexión en el servidor', () => {
      // io.listeners('connection') devuelve los handlers del evento
      expect(io.listeners('connection').length).toBeGreaterThan(0);
    });
  });
});
