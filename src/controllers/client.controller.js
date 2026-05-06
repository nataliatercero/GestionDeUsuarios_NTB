import Client from '../models/Client.js';
import Company from '../models/Company.js';
import { AppError } from '../utils/AppError.js';
import { getIO } from '../sockets/index.js';

export const createClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    if (!companyId) throw AppError.badRequest('Debes completar el onboarding de empresa primero');

    const existing = await Client.findOne({ cif: req.body.cif, company: companyId });
    if (existing) throw AppError.conflict('Ya existe un cliente con ese CIF en tu empresa');

    const client = await Client.create({ ...req.body, user: req.user._id, company: companyId });

    const company = await Company.findById(companyId).select('name');
    getIO()?.to(companyId.toString()).emit('client:new', {
      clientId: client._id,
      clientName: client.name,
      companyName: company?.name,
    });

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: req.params.id, company: companyId });
    if (!client) throw AppError.notFound('Cliente');

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

export const getClients = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const { page = 1, limit = 10, name, sort = 'createdAt' } = req.query;

    const filter = { company: companyId };
    if (name) filter.name = { $regex: name, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [clients, totalItems] = await Promise.all([
      Client.find(filter).sort(sort).skip(skip).limit(Number(limit))
        .populate('user', 'name lastName')
        .populate('company', 'name cif'),
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

export const getClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: req.params.id, company: companyId })
      .populate('user', 'name lastName')
      .populate('company', 'name cif');
    if (!client) throw AppError.notFound('Cliente');
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: req.params.id, company: companyId });
    if (!client) throw AppError.notFound('Cliente');

    if (req.query.soft === 'true') {
      await Client.softDeleteById(client._id, req.user._id.toString());
      return res.status(200).json({ success: true, message: 'Cliente archivado' });
    }

    await Client.hardDelete(client._id);
    res.status(200).json({ success: true, message: 'Cliente eliminado permanentemente' });
  } catch (error) {
    next(error);
  }
};

export const getArchivedClients = async (req, res, next) => {
  try {
    const companyId = req.user.company;
    const clients = await Client.findDeleted({ company: companyId })
      .populate('user', 'name lastName')
      .populate('company', 'name cif');
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
};

export const restoreClient = async (req, res, next) => {
  try {
    const companyId = req.user.company;
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
