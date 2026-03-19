import express from 'express';

const app = express();

// Para que el servidor entienda JSON en el cuerpo de las peticiones
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Servidor de BildyApp funcionando!');
});

export default app;