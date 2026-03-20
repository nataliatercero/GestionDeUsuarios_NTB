import express from 'express';
import { notFound, errorHandler } from './middleware/error-handler.js';

const app = express();

// Para que el servidor entienda JSON en el cuerpo de las peticiones
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Servidor de BildyApp funcionando!');
});

// Middlewares de Error (siempre al final)
app.use(notFound);      // Captura rutas que no existen (404)
app.use(errorHandler);  // Procesa cualquier error y envía el JSON

export default app;