import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const companySchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Referencia al admin que creó la empresa
      required: [true, 'El propietario de la empresa es requerido'],
      index: true // Index
    },
    name: {
      type: String,
      required: [true, 'El nombre de la empresa es requerido'],
      trim: true
    },
    cif: {
      type: String,
      required: [true, 'El CIF es requerido'],
      unique: true, //Index
      trim: true,
      uppercase: true // Para que el CIF vaya en mayúsculas
    },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String
    },
    logo: {
      type: String, // La ruta de la imagen (para Multer)
      default: null
    },
    isFreelance: {
      type: Boolean,
      default: false // true si el usuario se registró como autónomo
    }
  },
  {
    timestamps: true, // Crea createdAt y updatedAt automáticamente
    versionKey: false // Oculta el campo __v (Para respuestas un poco más limpias)
  }
);

companySchema.plugin(softDeletePlugin);
const Company = mongoose.model('Company', companySchema);

export default Company;