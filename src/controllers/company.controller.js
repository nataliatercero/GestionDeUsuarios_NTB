import Company from '../models/Company.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const updateCompanyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { name, cif, address, isFreelance } = req.body;

    // Lógica para Autónomos
    if (isFreelance) {
      cif = req.user.nif; // El CIF es su NIF
      name = `${req.user.name} ${req.user.lastName}`; // Nombre de empresa = Nombre real
      // La dirección se mantiene la que envíe o la del usuario
    }

    // Buscar si la empresa ya existe
    let company = await Company.findOne({ cif });
    let isNew = false;

    if (!company) {
      // CREAR: El usuario es el owner (será admin)
      company = await Company.create({
        name,
        cif,
        address,
        isFreelance,
        owner: userId
      });
      isNew = true;

      // Vincular al usuario (mantiene rol admin por defecto)
      await User.findByIdAndUpdate(userId, { company: company._id });
    } else {
      // UNIRSE: El usuario se vincula a una existente
      const isOwner = company.owner.toString() === userId.toString();
      
      await User.findByIdAndUpdate(userId, { 
        company: company._id,
        role: isOwner ? 'admin' : 'guest' // Si no es el dueño, pasa a ser guest
      });
    }

    // Buscamos el usuario actualizado para devolver el rol real en la respuesta
    const updatedUser = await User.findById(userId);

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