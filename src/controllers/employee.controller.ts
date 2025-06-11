import { Request, Response, NextFunction, RequestHandler } from 'express';
import Employee from '../models/Employee';
import bcrypt from 'bcryptjs';
import { createError } from '../utils/error';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';
import mongoose from 'mongoose';

// Definición de interfaz para el rol populado
interface PopulatedRole {
  _id: string;
  name: string;
}

// Obtener todos los empleados
export const getEmployees: RequestHandler = async (req, res, next) => {
  try {
    console.log('===== Controller: getEmployees =====');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    
    const skip = (page - 1) * limit;
    
    // Crear filtro de búsqueda
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const total = await Employee.countDocuments(filter);
    const employees = await Employee.find(filter)
      .select('-password')
      .populate('role', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
      
    // Transformar los datos para que role sea un string con el nombre del rol
    const formattedEmployees = employees.map(emp => {
      const employeeObj = emp.toObject();
      
      // Crear un nuevo objeto para la respuesta
      return {
        ...employeeObj,
        // Si el rol es un objeto (populado), extraer su nombre para mostrar
        roleName: employeeObj.role && typeof employeeObj.role === 'object' 
          ? (employeeObj.role as unknown as PopulatedRole).name 
          : String(employeeObj.role)
      };
    });
      
    res.json({
      data: formattedEmployees,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    next(createError(500, 'Error al obtener empleados'));
  }
};

// Obtener un empleado por ID
export const getEmployeeById: RequestHandler = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-password')
      .populate('role', 'name');
      
    if (!employee) {
      return next(createError(404, 'Empleado no encontrado'));
    }
    
    const employeeObj = employee.toObject();
    
    // Crear un nuevo objeto para la respuesta
    const formattedEmployee = {
      ...employeeObj,
      // Si el rol es un objeto (populado), extraer su nombre para mostrar
      roleName: employeeObj.role && typeof employeeObj.role === 'object' 
        ? (employeeObj.role as unknown as PopulatedRole).name 
        : String(employeeObj.role)
    };
      
    res.json(formattedEmployee);
  } catch (error) {
    next(createError(500, 'Error al obtener el empleado'));
  }
};

// Crear un nuevo empleado
export const createEmployee: RequestHandler = async (req, res, next) => {
  try {
    console.log('Datos recibidos para crear empleado:', JSON.stringify(req.body, null, 2));
    
    // Verificar que el rol sea un ObjectId válido
    if (req.body.role && !mongoose.Types.ObjectId.isValid(req.body.role)) {
      res.status(400).json({ 
        message: 'ID de rol no válido',
        field: 'role',
        value: req.body.role
      });
      return;
    }
    
    const employee = new Employee(req.body);
    
    // Intentar guardar y capturar errores de validación
    try {
      const savedEmployee = await employee.save();
      
      // Registrar auditoría
      await logAuditAction(
        req,
        'creación',
        `Empleado creado: ${savedEmployee.firstName} ${savedEmployee.lastName}`,
        'empleado',
        (savedEmployee._id as any).toString(),
        undefined,
        sanitizeDataForAudit(savedEmployee),
        'empleados'
      );
      
      res.status(201).json(savedEmployee);
    } catch (validationError: any) {
      // Si es un error de validación de Mongoose
      if (validationError.name === 'ValidationError') {
        const errors = Object.keys(validationError.errors).reduce((acc: any, key) => {
          acc[key] = validationError.errors[key].message;
          return acc;
        }, {});
        
        res.status(400).json({ 
          message: 'Error de validación', 
          errors 
        });
        return;
      }
      
      // Si es un error de duplicidad (por ejemplo, email duplicado)
      if (validationError.code === 11000) {
        const field = Object.keys(validationError.keyPattern)[0];
        res.status(400).json({ 
          message: `El ${field} ya está en uso`,
          field
        });
        return;
      }
      
      throw validationError;
    }
  } catch (error: any) {
    console.error('Error al crear empleado:', error);
    next(createError(500, `Error al crear el empleado: ${error.message}`));
  }
};

// Actualizar un empleado
export const updateEmployee: RequestHandler = async (req, res, next) => {
  try {
    console.log('Datos recibidos para actualizar empleado:', JSON.stringify(req.body, null, 2));
    
    // Determinar si es una actualización de perfil propio o de otro empleado
    const isProfileUpdate = req.originalUrl.includes('/profile/me');
    let employeeId;
    
    if (isProfileUpdate) {
      // Para actualización del propio perfil, usamos el ID del empleado autenticado
      if (!req.employee || !req.employee._id) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }
      employeeId = req.employee._id;
      console.log('Actualizando perfil propio:', employeeId);
      
      // Para actualización de perfil propio, restringir los campos que se pueden actualizar
      // No permitir cambios en campos críticos como role, isActive, etc.
      const allowedFields = [
        'phone', 'birthDate', 'gender', 'documentId', 'documentType',
        'address', 'city', 'state', 'country', 'postalCode',
        'linkedin', 'twitter', 'facebook', 'instagram', 'website'
      ];
      
      // Filtrar los campos permitidos
      const filteredBody = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});
        
      req.body = filteredBody;
      console.log('Datos filtrados para actualización de perfil:', filteredBody);
    } else {
      // Verificar que el ID sea válido para actualización normal
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: 'ID de empleado no válido' });
        return;
      }
      employeeId = req.params.id;
      
      // Verificar que el rol sea un ObjectId válido si está presente
      if (req.body.role && !mongoose.Types.ObjectId.isValid(req.body.role)) {
        res.status(400).json({ 
          message: 'ID de rol no válido',
          field: 'role',
          value: req.body.role
        });
        return;
      }
    }
    
    // Si la contraseña está presente, hashearla
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    
    try {
      // Obtener datos anteriores para auditoría
      const previousEmployee = await Employee.findById(employeeId).select('-password');
      
      const employee = await Employee.findByIdAndUpdate(
        employeeId,
        req.body,
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!employee) {
        res.status(404).json({ message: 'Empleado no encontrado' });
        return;
      }
      
      // Registrar auditoría
      const actionType = isProfileUpdate ? 'actualización de perfil' : 'actualización';
      await logAuditAction(
        req,
        'actualización',
        `${actionType}: ${employee.firstName} ${employee.lastName}`,
        'empleado',
        (employee._id as any).toString(),
        previousEmployee ? sanitizeDataForAudit(previousEmployee) : undefined,
        sanitizeDataForAudit(employee),
        'empleados'
      );
      
      res.json(employee);
    } catch (validationError: any) {
      // Si es un error de validación
      if (validationError.name === 'ValidationError') {
        const errors = Object.keys(validationError.errors).reduce((acc: any, key) => {
          acc[key] = validationError.errors[key].message;
          return acc;
        }, {});
        
        res.status(400).json({ 
          message: 'Error de validación', 
          errors 
        });
        return;
      }
      
      // Si es un error de duplicidad
      if (validationError.code === 11000) {
        const field = Object.keys(validationError.keyPattern)[0];
        res.status(400).json({ 
          message: `El ${field} ya está en uso`,
          field
        });
        return;
      }
      
      throw validationError;
    }
  } catch (error: any) {
    console.error('Error al actualizar empleado:', error);
    next(createError(500, `Error al actualizar el empleado: ${error.message}`));
  }
};

// Eliminar un empleado
export const deleteEmployee: RequestHandler = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) {
      return next(createError(404, 'Empleado no encontrado'));
    }
    
    await Employee.findByIdAndDelete(req.params.id);
    
    // Registrar auditoría
    await logAuditAction(
      req,
      'eliminación',
      `Empleado eliminado: ${employee.firstName} ${employee.lastName}`,
      'empleado',
      (employee._id as any).toString(),
      sanitizeDataForAudit(employee),
      undefined,
      'empleados'
    );
    
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    next(createError(500, 'Error al eliminar el empleado'));
  }
};

// Activar un empleado
export const activateEmployee: RequestHandler = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');
    
    if (!employee) {
      return next(createError(404, 'Empleado no encontrado'));
    }
    
    // Registrar auditoría
    await logAuditAction(
      req,
      'cambio_estado',
      `Empleado activado: ${employee.firstName} ${employee.lastName}`,
      'empleado',
      (employee._id as any).toString(),
      undefined,
      { isActive: true },
      'empleados'
    );
    
    res.json(employee);
  } catch (error) {
    next(createError(500, 'Error al activar el empleado'));
  }
};

// Desactivar un empleado
export const deactivateEmployee: RequestHandler = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');
    
    if (!employee) {
      return next(createError(404, 'Empleado no encontrado'));
    }
    
    // Registrar auditoría
    await logAuditAction(
      req,
      'cambio_estado',
      `Empleado desactivado: ${employee.firstName} ${employee.lastName}`,
      'empleado',
      (employee._id as any).toString(),
      undefined,
      { isActive: false },
      'empleados'
    );
    
    res.json(employee);
  } catch (error) {
    next(createError(500, 'Error al desactivar el empleado'));
  }
};

// Resetear la contraseña de un empleado (sin requerir la contraseña actual)
export const resetEmployeePassword: RequestHandler = async (req, res, next) => {
  try {
    const { newPassword, forcePasswordChange } = req.body;
    
    if (!newPassword) {
      return next(createError(400, 'La nueva contraseña es requerida'));
    }
    
    // Encontrar el empleado
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return next(createError(404, 'Empleado no encontrado'));
    }
    
    // Generar el hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar directamente la contraseña y establecer forcePasswordChange
    employee.password = hashedPassword;
    
    // Si se proporciona forcePasswordChange, lo establecemos
    if (forcePasswordChange !== undefined) {
      employee.forcePasswordChange = forcePasswordChange;
    }
    
    await employee.save();
    
    // Registrar auditoría
    await logAuditAction(
      req,
      'actualización',
      `Contraseña reseteada para empleado: ${employee.firstName} ${employee.lastName}`,
      'empleado',
      (employee._id as any).toString(),
      undefined,
      { passwordReset: true, forcePasswordChange: employee.forcePasswordChange },
      'empleados'
    );
    
    res.json({ 
      message: 'Contraseña actualizada correctamente',
      forcePasswordChange: employee.forcePasswordChange
    });
  } catch (error) {
    console.error('Error al resetear la contraseña:', error);
    next(createError(500, 'Error al resetear la contraseña'));
  }
}; 