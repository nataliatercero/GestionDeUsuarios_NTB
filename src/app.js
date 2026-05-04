import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit'
import { notFound, errorHandler } from './middlewares/error-handler.js';
import { sanitizeBody, limitStringLength } from './middlewares/sanitize.middleware.js';
import userRoutes from './routes/user.routes.js';
import clientRoutes from './routes/client.routes.js';
import projectRoutes from './routes/project.routes.js';
import deliveryNoteRoutes from './routes/deliverynote.routes.js';
import path from 'node:path';
import morganBody from 'morgan-body';
import { loggerStream } from './utils/handleLogger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

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

// LOGGER DE PETICIONES (errores 4XX/5XX en consola - los 5XX también van a Slack vía error-handler)
morganBody(app, {
  noColors: true,
  skip: (req, res) => res.statusCode < 400,
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

// DOCUMENTACIÓN
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// JSON de la spec 
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// RUTAS
app.use('/api/user', userRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/deliverynote', deliveryNoteRoutes);

// MIDDLEWARES DE ERROR (Siempre al final)
app.use(notFound);      // Captura rutas que no existen (404)
app.use(errorHandler);  // Procesa cualquier error y envía el JSON

export default app;