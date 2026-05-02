import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const projectSchema = new Schema(
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
    client: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'El nombre del proyecto es requerido'],
      trim: true
    },
    projectCode: {
      type: String,
      required: [true, 'El código de proyecto es requerido'],
      trim: true
    },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    notes: {
      type: String,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

projectSchema.plugin(softDeletePlugin);
const Project = mongoose.model('Project', projectSchema);

export default Project;