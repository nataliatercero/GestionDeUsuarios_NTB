import mongoose from 'mongoose';

export const dbConnect = async () => {
  try {
    const url = process.env.DB_URI;

    await mongoose.connect(url);
    console.log('Conexión establecida con MongoDB Atlas');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    throw error;
  }
};
