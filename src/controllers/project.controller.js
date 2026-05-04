import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';

// Crear un proyecto nuevo vinculado a un cliente de la misma empresa
export const createProject = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    if (!companyId) throw AppError.badRequest('Debes completar el onboarding de empresa primero');

    // Verificar que el cliente existe y pertenece a la empresa
    const client = await Client.findOne({ _id: req.body.client, company: companyId });
    if (!client) throw AppError.notFound('Cliente');

    // Validar que el código de proyecto sea único dentro de la compañía
    const existing = await Project.findOne({ projectCode: req.body.projectCode, company: companyId });
    if (existing) throw AppError.conflict('Ya existe un proyecto con ese código en tu empresa');

    const project = await Project.create({ ...req.body, user: req.user._id, company: companyId });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// Actualizar información de un proyecto existente
export const updateProject = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const project = await Project.findOne({ _id: req.params.id, company: companyId });
    if (!project) throw AppError.notFound('Proyecto');

    // Si se cambia el código, verificar que no esté en uso por otro proyecto
    if (req.body.projectCode) {
      const conflict = await Project.findOne({ projectCode: req.body.projectCode, company: companyId, _id: { $ne: project._id } });
      if (conflict) throw AppError.conflict('Ya existe un proyecto con ese código en tu empresa');
    }

    // Si se cambia el cliente, validar que pertenezca a la empresa
    if (req.body.client) {
      const client = await Client.findOne({ _id: req.body.client, company: companyId });
      if (!client) throw AppError.notFound('Cliente');
    }

    Object.assign(project, req.body);
    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// Listar proyectos con paginación y filtros por cliente, nombre o estado
export const getProjects = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { page = 1, limit = 10, client, name, active, sort = '-createdAt' } = req.query;

    const filter = { company: companyId };
    if (client) filter.client = client;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (active !== undefined) filter.active = active === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, totalItems] = await Promise.all([
      Project.find(filter).sort(sort).skip(skip).limit(Number(limit)).populate('client', 'name cif'),
      Project.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: projects,
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

// Obtener un proyecto específico con los datos del cliente incluidos
export const getProject = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const project = await Project.findOne({ _id: req.params.id, company: companyId })
      .populate('client', 'name cif email');
    if (!project) throw AppError.notFound('Proyecto');
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// Borrar proyecto
export const deleteProject = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const project = await Project.findOne({ _id: req.params.id, company: companyId });
    if (!project) throw AppError.notFound('Proyecto');

    if (req.query.soft === 'true') {
      await Project.softDeleteById(project._id, req.user._id.toString());
      return res.status(200).json({ success: true, message: 'Proyecto archivado' });
    }

    await Project.hardDelete(project._id);
    res.status(200).json({ success: true, message: 'Proyecto eliminado permanentemente' });
  } catch (error) {
    next(error);
  }
};

// Listar proyectos que han sido archivados
export const getArchivedProjects = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const projects = await Project.findDeleted({ company: companyId });
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

// Restaurar un proyecto desde la papelera/archivo
export const restoreProject = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    // withDeleted: true para encontrar el documento en la papelera
    const project = await Project.findOne({ _id: req.params.id, company: companyId }).setOptions({ withDeleted: true });
    
    if (!project) throw AppError.notFound('Proyecto');
    if (!project.deleted) throw AppError.badRequest('El proyecto no está archivado');

    await Project.restoreById(project._id);
    const restored = await Project.findById(project._id);
    res.status(200).json({ success: true, data: restored });
  } catch (error) {
    next(error);
  }
};