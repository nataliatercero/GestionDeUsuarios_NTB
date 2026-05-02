import DeliveryNote from '../models/DeliveryNote.js';
import Project from '../models/Project.js';
import { AppError } from '../utils/AppError.js';

// Crear un nuevo albarán vinculado a un proyecto y su cliente
export const createDeliveryNote = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    if (!companyId) throw AppError.badRequest('Debes completar el onboarding de empresa primero');

    const { project: projectId, ...rest } = req.body;

    // Verificar que el proyecto existe y pertenece a la empresa del usuario
    const project = await Project.findOne({ _id: projectId, company: companyId });
    if (!project) throw AppError.notFound('Proyecto');

    // El cliente se hereda automáticamente del proyecto seleccionado
    const note = await DeliveryNote.create({
      ...rest,
      project: project._id,
      client: project.client,
      user: req.user._id,
      company: companyId
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// Listar albaranes con soporte para filtros complejos (proyecto, cliente, fechas y estado de firma)
export const getDeliveryNotes = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { page = 1, limit = 10, project, client, format, signed, from, to, sort = '-workDate' } = req.query;

    const filter = { company: companyId };
    
    // Aplicación dinámica de filtros según los parámetros de la URL
    if (project) filter.project = project;
    if (client) filter.client = client;
    if (format) filter.format = format;
    if (signed !== undefined) filter.signed = signed === 'true';
    
    // Filtro por rango de fechas de trabajo
    if (from || to) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = new Date(from);
      if (to) filter.workDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notes, totalItems] = await Promise.all([
      DeliveryNote.find(filter).sort(sort).skip(skip).limit(Number(limit)),
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

// Obtener un albarán detallado con toda la información de usuario, cliente y proyecto relacionada
export const getDeliveryNote = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: companyId })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email')
      .populate('project', 'name projectCode');

    if (!note) throw AppError.notFound('Albarán');
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// Eliminar albarán (solo permitido si aún no ha sido firmado)
export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: companyId });
    
    if (!note) throw AppError.notFound('Albarán');
    
    // Bloqueo de seguridad: un albarán firmado es un documento legal que no debe borrarse
    if (note.signed) throw AppError.badRequest('No se puede eliminar un albarán firmado');

    await DeliveryNote.hardDelete(note._id);
    res.status(200).json({ success: true, message: 'Albarán eliminado' });
  } catch (error) {
    next(error);
  }
};