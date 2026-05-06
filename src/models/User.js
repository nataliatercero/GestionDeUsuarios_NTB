import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false
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
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true
    },
    refreshToken: {
      type: String,
      select: false
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
      ref: 'Company',
      index: true
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
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.verificationAttempts;
        return ret;
      },
    },
    toObject: { virtuals: true }
  }
);

userSchema.virtual('fullName').get(function () {
  if (!this.name && !this.lastName) return null;
  return `${this.name || ''} ${this.lastName || ''}`.trim();
});

userSchema.plugin(softDeletePlugin);
const User = mongoose.model('User', userSchema);

export default User;
