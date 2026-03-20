import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true, // Index
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false // Seguridad: No se envía en consultas (por defecto)
    },
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true
    },
    nif: {
      type: String,
      required: [true, 'El NIF es requerido'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin',
      index: true, // Index 
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true, // Index 
    },
    verificationCode: {
      type: String,
    },
    verificationAttempts: {
      type: Number,
      default: 3,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company', // Referencia para el Populate
      index: true,    // Index 
    },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String,
    },
    deleted: {
      type: Boolean,
      default: false, // Soft delete
    },
  },
  {
    timestamps: true, // Crea createdAt y updatedAt automáticamente
    versionKey: false, // Oculta el campo __v (Para respuestas un poco más limpias)
    // Configuración para que los Virtuals aparezcan al convertir a JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: fullName (No se almacena en la base de datos, se calcula al tranformar a JSON)
userSchema.virtual('fullName').get(function () {
  return `${this.name} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

export default User;