import { createServer } from 'http';
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
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();
