import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { IEmployee } from '../models/Employee';
import Employee from '../models/Employee';
import Role from '../models/Role';
import mongoose from 'mongoose';

interface JwtPayload {
  employeeId: string;
  permissions?: string[];
  role?: string;
}

interface ForcePasswordChangeResponse {
  forcePasswordChange: boolean;
}

declare global {
  namespace Express {
    interface Request {
      employee?: IEmployee;
    }
  }
}

// Función auxiliar para obtener el JWT_SECRET
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }
  return secret;
};

// Función para obtener los permisos de un usuario desde la base de datos
const getEmployeePermissionsFromDB = async (employeeId: string, roleIdOrName: any): Promise<string[]> => {
  try {
    console.log(`Consultando permisos para el rol ${roleIdOrName} del empleado ${employeeId}`);
    
    let role;
    
    // Determinar si roleIdOrName es un ObjectId o un nombre de rol
    const isObjectId = mongoose.Types.ObjectId.isValid(roleIdOrName);
    
    if (isObjectId) {
      // Buscar el rol por ID
      role = await Role.findById(roleIdOrName).populate('permissions');
      console.log(`Buscando rol por ID: ${roleIdOrName}`);
    } else {
      // Buscar el rol por nombre
      role = await Role.findOne({ name: roleIdOrName }).populate('permissions');
      console.log(`Buscando rol por nombre: ${roleIdOrName}`);
    }
    
    if (!role || !role.isActive) {
      console.log(`Rol ${roleIdOrName} no encontrado o inactivo`);
      return [];
    }

    // Registrar información del rol encontrado
    console.log(`Rol encontrado: ${role.name} (ID: ${role._id})`);
    
    // Verificar que role.permissions exista antes de acceder a length
    if (!role.permissions) {
      console.log('Error: role.permissions es undefined');
      return [];
    }
    
    console.log(`Número de permisos encontrados: ${role.permissions.length}`);

    // Convertir los permisos a un formato 'module:action'
    const permissionStrings = role.permissions
      .filter((permission: any) => permission.isActive)
      .map((permission: any) => `${permission.module}:${permission.action}`);

    console.log(`Permisos obtenidos directamente de la base de datos:`, permissionStrings);
    return permissionStrings;
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    return [];
  }
};

export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Registro detallado para depuración
    console.log('===== Autenticación =====');
    console.log('Ruta solicitada:', req.originalUrl);
    console.log('Método:', req.method);
    console.log('Authorization header present:', !!authHeader);
    console.log('Token present:', !!token);
    console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);

    if (!token) {
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    try {
      const jwtSecret = getJwtSecret();
      console.log('Validando token con secreto:', jwtSecret.substring(0, 10) + '...');
      
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      console.log('Token decodificado:', { 
        employeeId: decoded.employeeId, 
        role: decoded.role,
        permissions: decoded.permissions || [] 
      });
      
      // Validación extendida: verificar que el empleado existe en la base de datos
      const employee = await Employee.findById(decoded.employeeId);
      if (!employee) {
        console.log('El empleado no existe en la base de datos');
        res.status(401).json({ message: 'Empleado no encontrado' });
        return;
      }
      
      if (!employee.isActive) {
        console.log('El empleado está inactivo');
        res.status(403).json({ message: 'Empleado inactivo' });
        return;
      }

      // Verificar si el empleado debe cambiar su contraseña
      if (employee.forcePasswordChange) {
        console.log('El empleado debe cambiar su contraseña');
        
        // Si la ruta actual no es para cambiar la contraseña, redirigir
        const isChangingPassword = req.originalUrl.includes('/change-password') || 
                                  req.originalUrl.includes('/auth/change-password');
        
        if (!isChangingPassword) {
          // Devolver un código especial para indicar que debe cambiar la contraseña
          res.status(200).json({ 
            forcePasswordChange: true,
            message: 'Debe cambiar su contraseña' 
          } as ForcePasswordChangeResponse);
          return;
        }
      }

      // Obtener permisos directamente de la base de datos en lugar de usar los del token
      const permissions = await getEmployeePermissionsFromDB(
        (employee as any)._id.toString(), 
        (employee as any).role.toString()
      );
      console.log('Permisos obtenidos de la base de datos:', permissions);
      
      // Usar as any para evitar problemas de tipo con documentos de mongoose
      req.employee = {
        _id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        isActive: employee.isActive,
        permissions, // Asignar los permisos obtenidos de la base de datos
        lastLogin: employee.lastLogin,
        forcePasswordChange: employee.forcePasswordChange
      } as any as IEmployee;
      
      next();
    } catch (error) {
      const jwtError = error as JsonWebTokenError;
      console.error('Error al verificar el token JWT:', jwtError.message);
      res.status(403).json({ message: 'Token inválido', error: jwtError.message });
      return;
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const checkPermissions = (requiredPermissions: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.employee) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    // Acceder a los permisos del empleado que hemos asignado previamente
    const employeePermissions = (req.employee as any).permissions || [];
    
    console.log('Verificando permisos:');
    console.log('Permisos requeridos:', requiredPermissions);
    console.log('Permisos del empleado:', employeePermissions);

    // Verificar si el empleado tiene todos los permisos requeridos
    const hasPermission = requiredPermissions.every(permission => 
      employeePermissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({ 
        message: 'No autorizado', 
        requiredPermissions,
        employeePermissions
      });
      return;
    }

    next();
  };
}; 