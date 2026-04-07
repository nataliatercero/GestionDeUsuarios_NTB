import Company from '../models/Company.js';
import User from '../models/User.js';
import notificationService from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';

export const updateCompanyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { name, cif, address, isFreelance } = req.body;

    // Lógica para Autónomos
    if (isFreelance) {
      cif = req.user.nif; 
      name = req.user.fullName;
      // Si no envían dirección en el body, usamos la que ya tiene el usuario
      address = address || req.user.address; 
    }

    // Buscar si la empresa ya existe
    let company = await Company.findOne({ cif });
    let isNew = false;
    let finalRole = 'admin'; // Por defecto, el que llega aquí suele ser admin

    if (!company) {
      // CASO A: CREAR EMPRESA
      company = await Company.create({
        name,
        cif,
        address,
        isFreelance,
        owner: userId
      });
      isNew = true;
    } else {
      // CASO B: UNIRSE A EMPRESA EXISTENTE
      // Solo es admin si ya era el owner de esa empresa
      const isOwner = company.owner.toString() === userId.toString();
      finalRole = isOwner ? 'admin' : 'guest';
    }

    // Vincular usuario y actualizar rol en una sola operación
    // { new: true } nos devuelve el usuario ya actualizado
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        company: company._id, 
        role: finalRole 
      }, 
      { new: true, runValidators: true }
    );

    // Eventos
    const eventName = isNew ? 'company:created' : 'company:joined';
    notificationService.emit(eventName, { 
      fullName: req.user.fullName, 
      name: company.name, 
      cif: company.cif 
    });

    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? 'Empresa creada y vinculada' : 'Vinculado a empresa existente',
      data: {
        company,
        userRole: updatedUser.role
      }
    });

  } catch (error) {
    next(error);
  }
};