import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const clientSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'El nombre del cliente es requerido'],
      trim: true
    },
    cif: {
      type: String,
      required: [true, 'El CIF del cliente es requerido'],
      trim: true,
      uppercase: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

clientSchema.plugin(softDeletePlugin);
const Client =  mongoose.model('Client', clientSchema);

export default Client;
