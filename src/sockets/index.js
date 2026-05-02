import { Server } from 'socket.io';

let io = null;

export const setupSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => io;
