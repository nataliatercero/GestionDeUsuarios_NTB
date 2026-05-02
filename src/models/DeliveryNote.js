import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const { Schema } = mongoose;

const deliveryNoteSchema = new Schema(
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
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    format: {
      type: String,
      enum: ['material', 'hours'],
      required: [true, 'El formato del albarán es requerido']
    },
    description: {
      type: String,
      trim: true
    },
    workDate: {
      type: Date,
      default: Date.now
    },
    // Campos para format: 'material'
    material: String,
    quantity: Number,
    unit: String,
    // Campos para format: 'hours'
    hours: Number,
    workers: [
      {
        name: { type: String, required: true, trim: true },
        hours: { type: Number, required: true },
        _id: false
      }
    ],
    // Firma
    signed: {
      type: Boolean,
      default: false,
      index: true
    },
    signedAt: Date,
    signatureUrl: String,
    pdfUrl: String
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

deliveryNoteSchema.plugin(softDeletePlugin);
const DeliveryNote = mongoose.model('DeliveryNote', deliveryNoteSchema);

export default DeliveryNote;