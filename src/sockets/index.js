import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io = null;

export const setupSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // JWT auth: solo usuarios autenticados pueden conectarse
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Unir al socket al room de su compañía para aislar eventos entre empresas
    const companyId = socket.user?.company?.toString();
    if (companyId) socket.join(companyId);

    console.log(`[Socket.IO] Cliente conectado: ${socket.id} (compañía: ${companyId ?? 'sin empresa'})`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => io;
