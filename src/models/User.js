import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true, // Index
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false // Seguridad: No se envía en consultas (por defecto)
    },
    name: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    nif: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin',
      index: true // Index 
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true // Index 
    },
    refreshToken: {
      type: String,
      select: false // No lo enviamos en los GET por seguridad
    },
    verificationCode: {
      type: String,
      select: false
    },
    verificationAttempts: {
      type: Number,
      default: 3
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company', // Referencia para el Populate
      index: true    // Index 
    },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String
    }
  },
  {
    timestamps: true, // Crea createdAt y updatedAt automáticamente
    versionKey: false, // Oculta el campo __v (Para respuestas un poco más limpias)
    // Configuración para que los Virtuals aparezcan al convertir a JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: fullName (No se almacena en la base de datos, se calcula al tranformar a JSON)
userSchema.virtual('fullName').get(function () {
  if (!this.name && !this.lastName) return null; // Retorna null si el usuario aún no ha completado el onboarding de nombre y apellidos
  return `${this.name || ''} ${this.lastName || ''}`.trim(); // Elimina espacios sobrantes si falta alguno de los dos con .trim (si no hay alguno de los dos pone '' para que no salga "undefined")
});

userSchema.plugin(softDeletePlugin);
const User = mongoose.model('User', userSchema);


export default User;