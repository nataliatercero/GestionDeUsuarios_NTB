import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const companySchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El propietario de la empresa es requerido'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'El nombre de la empresa es requerido'],
      trim: true
    },
    cif: {
      type: String,
      required: [true, 'El CIF es requerido'],
      unique: true,
      trim: true,
      uppercase: true
    },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String
    },
    logo: {
      type: String,
      default: null
    },
    isFreelance: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

companySchema.plugin(softDeletePlugin);
const Company = mongoose.model('Company', companySchema);

export default Company;
