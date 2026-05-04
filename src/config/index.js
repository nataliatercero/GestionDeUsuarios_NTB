import mongoose from 'mongoose';

// Conectar a la base de datos de MongoDb

export const dbConnect = async () => {
  try {
    // Variable en .env
    const url = process.env.DB_URI;
    
    await mongoose.connect(url);
    console.log('Conexión establecida con MongoDB Atlas');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    throw error; // Lanzamos el error para que index.js lo gestione
  }
};