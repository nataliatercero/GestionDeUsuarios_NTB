import app from './app.js';

// El puerto del .env
const PORT = process.env.PORT || 3000;

// Arrancar el servidor
const startServer = async () => {
  try {
    // await dbConnect();
    
    app.listen(PORT, () => {
      console.log(`Servidor de bildy app en: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1); // Detener el proceso si hay un error
  }
};

startServer();