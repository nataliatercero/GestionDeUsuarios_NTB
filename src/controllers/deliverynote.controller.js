import sharp from 'sharp';
import DeliveryNote from '../models/DeliveryNote.js';
import Project from '../models/Project.js';
import Company from '../models/Company.js';
import { AppError } from '../utils/AppError.js';
import { uploadToCloudinary } from '../services/storage.service.js';
import { generateDeliveryNotePdf } from '../services/pdf.service.js';
import { getIO } from '../sockets/index.js';
import { sendSlackNotification } from '../utils/handleLogger.js';

export const createDeliveryNote = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    if (!companyId) throw AppError.badRequest('Debes completar el onboarding de empresa primero');

    const { project: projectId, ...rest } = req.body;

    const project = await Project.findOne({ _id: projectId, company: companyId });
    if (!project) throw AppError.notFound('Proyecto');

    const note = await DeliveryNote.create({
      ...rest,
      project: project._id,
      client: project.client,
      user: req.user._id,
      company: companyId
    });

    const company = await Company.findById(companyId).select('name');
    getIO()?.to(companyId.toString()).emit('deliverynote:new', {
      noteId: note._id,
      format: note.format,
      companyName: company?.name,
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryNotes = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { page = 1, limit = 10, project, client, format, signed, from, to, sort = '-workDate' } = req.query;

    const filter = { company: companyId };
    if (project) filter.project = project;
    if (client) filter.client = client;
    if (format) filter.format = format;
    if (signed !== undefined) filter.signed = signed === 'true';
    if (from || to) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = new Date(from);
      if (to) filter.workDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notes, totalItems] = await Promise.all([
      DeliveryNote.find(filter).sort(sort).skip(skip).limit(Number(limit))
        .populate('user', 'name lastName')
        .populate('client', 'name')
        .populate('project', 'name projectCode')
        .populate('company', 'name cif'),
      DeliveryNote.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: notes,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / Number(limit)),
        currentPage: Number(page)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryNote = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: companyId })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email')
      .populate('project', 'name projectCode')
      .populate('company', 'name cif');

    if (!note) throw AppError.notFound('Albarán');
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: companyId });

    if (!note) throw AppError.notFound('Albarán');
    if (note.signed) throw AppError.badRequest('No se puede eliminar un albarán firmado');

    await DeliveryNote.hardDelete(note._id);
    res.status(200).json({ success: true, message: 'Albarán eliminado' });
  } catch (error) {
    next(error);
  }
};

export const signDeliveryNote = async (req, res, next) => {
  try {
    if (!req.file) throw AppError.badRequest('Se requiere la imagen de la firma');

    const companyId = req.user.company;
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: companyId })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email')
      .populate('project', 'name projectCode');

    if (!note) throw AppError.notFound('Albarán');
    if (note.signed) throw AppError.badRequest('El albarán ya ha sido firmado');

    const company = await Company.findById(companyId);

    const { url: signatureUrl } = await uploadToCloudinary(req.file.buffer, {
      folder: 'bildy/signatures',
      publicId: `signature-${note._id}`,
      maxWidth: 600,
    });

    note.signatureUrl = signatureUrl;
    note.signed = true;
    note.signedAt = new Date();

    let signatureForPdf = null;
    try {
      signatureForPdf = await sharp(req.file.buffer).png().toBuffer();
    } catch { /* el PDF se genera igualmente sin la imagen */ }

    const pdfBuffer = await generateDeliveryNotePdf(note, company, signatureForPdf);

    const { url: pdfUrl } = await uploadToCloudinary(pdfBuffer, {
      folder: 'bildy/pdfs',
      publicId: `albaran-${note._id}.pdf`,
      resourceType: 'raw',
    });

    const signed = await DeliveryNote.findByIdAndUpdate(
      note._id,
      { signed: true, signedAt: new Date(), signatureUrl, pdfUrl },
      { new: true }
    ).populate('user', 'name lastName')
      .populate('client', 'name')
      .populate('project', 'name projectCode')
      .populate('company', 'name cif');

    getIO()?.to(companyId.toString()).emit('deliverynote:signed', {
      noteId: signed._id,
      companyName: company?.name,
      pdfUrl,
      signedAt: signed.signedAt,
    });

    sendSlackNotification(`📝 Albarán *${signed._id}* firmado. PDF: ${pdfUrl}`);

    res.status(200).json({ success: true, data: signed });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryNotePdf = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: companyId })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email')
      .populate('project', 'name projectCode');

    if (!note) throw AppError.notFound('Albarán');

    const isOwner = note.user._id.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      throw AppError.forbidden('No tienes permiso para descargar este albarán');
    }

    if (note.signed && note.pdfUrl) {
      return res.redirect(note.pdfUrl);
    }

    const company = await Company.findById(companyId);
    const pdfBuffer = await generateDeliveryNotePdf(note, company);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="albaran-${note._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
