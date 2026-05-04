import { createServer } from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { dbConnect } from './config/index.js';
import { setupSocket } from './sockets/index.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await dbConnect();

    const httpServer = createServer(app);
    setupSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Servidor de bildy app en: http://localhost:${PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n[${signal}] Cerrando servidor...`);

      // 1. Dejar de aceptar nuevas conexiones
      httpServer.close(async () => {
        console.log('Servidor HTTP cerrado.');

        try {
          // 2. Cerrar conexión a MongoDB
          await mongoose.connection.close();
          console.log('Conexión a MongoDB cerrada.');
          process.exit(0);
        } catch (err) {
          console.error('Error al cerrar MongoDB:', err.message);
          process.exit(1);
        }
      });

      // Forzar salida si tarda más de 10 segundos
      setTimeout(() => {
        console.error('Cierre forzado por timeout.');
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();
