import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit'
import { notFound, errorHandler } from './middlewares/error-handler.js';
import { sanitizeBody, limitStringLength } from './middlewares/sanitize.middleware.js';
import userRoutes from './routes/user.routes.js';
import delivery_noteRoutes from './routes/delivery_note.routes.js';
import path from 'node:path';
import morganBody from 'morgan-body';
import { loggerStream } from './utils/handleLogger.js';

const app = express();

// SEGURIDAD

// Añade cabeceras de seguridad (oculta el uso de Express)
app.use(helmet());

// Evita ataques limitando peticiones por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 100, // Límite de 100 peticiones por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo en 15 minutos.',
  standardHeaders: true, // Devuelve información del límite en las cabeceras 'RateLimit-*'
  legacyHeaders: false, // Desactiva las cabeceras 'X-RateLimit-*' antiguas
});
// Solo usamos el limiter si NO estamos testeando
if (process.env.NODE_ENV !== 'test') {
  app.use(limiter);
}

// MIDDLEWARES DE PARSEO

// Para que el servidor entienda JSON en el cuerpo de las peticiones
app.use(express.json());

// ARCHIVOS ESTÁTICOS

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// LIMPIEZA
app.use(sanitizeBody); 
app.use(limitStringLength(5000)); // Limitamos a 5000 caracteres por seguridad

// LOGGER PARA SLACK
morganBody(app, {
  noColors: true,
  skip: (req, res) => res.statusCode < 400, // Solo errores
  stream: loggerStream
});

// SALUD
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// RUTAS

// Ruta de prueba
app.use('/api/user', userRoutes);
app.use('/api/delivery_note', delivery_noteRoutes);

// MIDDLEWARES DE ERROR (Siempre al final)
app.use(notFound);      // Captura rutas que no existen (404)
app.use(errorHandler);  // Procesa cualquier error y envía el JSON

export default app;