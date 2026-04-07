import Company from '../models/Company.js';
import User from '../models/User.js';
import notificationService from '../services/notification.service.js';
import { AppError } from '../utils/AppError.js';

export const updateCompanyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Extraemos los datos que vienen del validador (Zod discriminatedUnion)
    let { name, cif, address, isFreelance } = req.body;

    // Lógica para Autónomos 
    if (isFreelance) {
      // Si es autónomo, ignoramos lo que venga en el body y usamos sus datos de perfil
      cif = req.user.nif; 
      name = req.user.fullName;
      // La dirección de la empresa es su dirección personal
      address = req.user.address; 
    }

    // Buscar si la empresa ya existe por CIF
    let company = await Company.findOne({ cif });
    let isNew = false;
    let finalRole = 'admin'; 

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
      // Si el CIF ya existía, el usuario se une. 
      // Por rúbrica: "el usuario se une a esa compañía existente y su role cambia a guest"
      // EXCEPCIÓN: Si ya era el owner (por si repite la petición), se queda como admin.
      const isOwner = company.owner?.toString() === userId.toString();
      finalRole = isOwner ? 'admin' : 'guest';
    }

    // Vincular usuario y actualizar rol
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        company: company._id, 
        role: finalRole 
      }, 
      { new: true, runValidators: true }
    );

    // Emisión de Eventos
    const eventName = isNew ? 'company:created' : 'company:joined';
    notificationService.emit(eventName, { 
      userName: req.user.fullName, 
      companyName: company.name, 
      cif: company.cif 
    });

    // Respuesta (201 si es creación, 200 si es vínculo)
    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? 'Empresa creada y vinculada correctamente' : 'Vinculado a empresa existente',
      data: {
        company,
        userRole: updatedUser.role
      }
    });

  } catch (error) {
    next(error);
  }
};