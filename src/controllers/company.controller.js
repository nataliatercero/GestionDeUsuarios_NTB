import Company from '../models/Company.js';
import User from '../models/User.js';
import notificationService from '../services/notification.service.js';
import { AppError } from '../utils/AppError.js';

export const updateCompanyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { name, cif, address, isFreelance } = req.body;

    if (isFreelance) {
      cif = req.user.nif;
      name = req.user.fullName;
      address = req.user.address;
    }

    let company = await Company.findOne({ cif });
    let isNew = false;
    let finalRole = 'admin';

    if (!company) {
      company = await Company.create({
        name,
        cif,
        address,
        isFreelance,
        owner: userId
      });
      isNew = true;
    } else {
      const isOwner = company.owner?.toString() === userId.toString();
      finalRole = isOwner ? 'admin' : 'guest';
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        company: company._id,
        role: finalRole
      },
      { new: true, runValidators: true }
    );

    const eventName = isNew ? 'company:created' : 'company:joined';
    notificationService.emit(eventName, {
      userName: req.user.fullName,
      companyName: company.name,
      cif: company.cif
    });

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
