import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit'
import { notFound, errorHandler } from './middlewares/error-handler.js';
import { sanitizeBody, limitStringLength } from './middlewares/sanitize.middleware.js';

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
app.use(limiter);

// MIDDLEWARES DE PARSEO

// Para que el servidor entienda JSON en el cuerpo de las peticiones
app.use(express.json());

// LIMPIEZA
app.use(sanitizeBody); 
app.use(limitStringLength(5000)); // Limitamos a 5000 caracteres por seguridad

// RUTAS

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Servidor de BildyApp funcionando!');
});

// MIDDLEWARES DE ERROR (Siempre al final)
app.use(notFound);      // Captura rutas que no existen (404)
app.use(errorHandler);  // Procesa cualquier error y envía el JSON

export default app;