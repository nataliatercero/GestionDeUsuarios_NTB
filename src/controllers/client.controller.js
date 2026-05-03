import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { getIO } from '../sockets/index.js';

// Crear un nuevo cliente asociado a la empresa del usuario
export const createClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    if (!companyId) throw AppError.badRequest('Debes completar el onboarding de empresa primero');

    // Evitar CIF duplicados en la misma empresa
    const existing = await Client.findOne({ cif: req.body.cif, company: companyId });
    if (existing) throw AppError.conflict('Ya existe un cliente con ese CIF en tu empresa');

    const client = await Client.create({ ...req.body, user: req.user._id, company: companyId });

    getIO()?.emit('client:created', { clientId: client._id, companyId, name: client.name });

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// Actualizar datos de un cliente existente
export const updateClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: req.params.id, company: companyId });
    if (!client) throw AppError.notFound('Cliente');

    // Si se intenta cambiar el CIF, verificar que no choque con otro cliente
    if (req.body.cif) {
      const conflict = await Client.findOne({ cif: req.body.cif, company: companyId, _id: { $ne: client._id } });
      if (conflict) throw AppError.conflict('Ya existe un cliente con ese CIF en tu empresa');
    }

    Object.assign(client, req.body);
    await client.save();
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// Obtener lista de clientes con paginación y filtro por nombre
export const getClients = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { page = 1, limit = 10, name, sort = 'createdAt' } = req.query;

    const filter = { company: companyId };
    if (name) filter.name = { $regex: name, $options: 'i' }; // Búsqueda parcial insensible a mayúsculas

    const skip = (Number(page) - 1) * Number(limit);
    const [clients, totalItems] = await Promise.all([
      Client.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Client.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: clients,
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

// Obtener los detalles de un cliente específico
export const getClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: req.params.id, company: companyId });
    if (!client) throw AppError.notFound('Cliente');
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// Eliminar un cliente
export const deleteClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: req.params.id, company: companyId });
    if (!client) throw AppError.notFound('Cliente');

    // Borrado lógico (archivar)
    if (req.query.soft === 'true') {
      await Client.softDeleteById(client._id, req.user._id.toString());
      return res.status(200).json({ success: true, message: 'Cliente archivado' });
    }

    // Borrado físico (permanente)
    await Client.hardDelete(client._id);
    res.status(200).json({ success: true, message: 'Cliente eliminado permanentemente' });
  } catch (error) {
    next(error);
  }
};

// Listar únicamente los clientes que han sido archivados (soft delete)
export const getArchivedClients = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const clients = await Client.findDeleted({ company: companyId });
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
};

// Restaurar un cliente que estaba previamente archivado
export const restoreClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    // Buscamos incluyendo eliminados para poder restaurar
    const client = await Client.findOne({ _id: req.params.id, company: companyId }).setOptions({ withDeleted: true });
    
    if (!client) throw AppError.notFound('Cliente');
    if (!client.deleted) throw AppError.badRequest('El cliente no está archivado');

    await Client.restoreById(client._id);
    const restored = await Client.findById(client._id);
    res.status(200).json({ success: true, data: restored });
  } catch (error) {
    next(error);
  }
};