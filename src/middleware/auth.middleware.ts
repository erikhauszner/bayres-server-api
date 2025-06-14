import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { IEmployee } from '../models/Employee';
import Employee from '../models/Employee';
import { PermissionService, PermissionError } from '../services/permission.service';
import mongoose from 'mongoose';
import Logger from '../utils/logger';

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

export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Registro detallado para depuración
    Logger.debug('Autenticación', {
      route: req.originalUrl,
      method: req.method,
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      hasJwtSecret: !!process.env.JWT_SECRET
    });

    if (!token) {
      Logger.warn('Token no proporcionado en solicitud', {
        route: req.originalUrl,
        method: req.method,
        authHeader: authHeader ? authHeader.substring(0, 20) + '...' : 'none'
      });
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    try {
      Logger.debug('🔍 Validando token con renovación automática', {
        route: req.originalUrl,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...'
      });
      
      // Usar el AuthService mejorado que incluye renovación automática
      const AuthService = await import('../services/employee-auth.service').then(m => m.AuthService);
      const validationResult = await AuthService.validateToken(token);
      const { employee, newToken } = validationResult;
      
      Logger.debug('✅ Token validado exitosamente', { 
        employeeId: employee._id,
        employeeEmail: employee.email,
        role: employee.role,
        isActive: employee.isActive,
        tokenRenewed: !!newToken,
        route: req.originalUrl
      });
      
      // Si se generó un nuevo token, enviarlo en la respuesta
      if (newToken) {
        res.setHeader('X-New-Token', newToken);
        Logger.info('Nuevo token enviado al cliente', { 
          employeeId: employee._id 
        });
      }
      
      if (!employee.isActive) {
        Logger.warn('Intento de autenticación con cuenta inactiva', { employeeId: employee._id });
        res.status(403).json({ 
          message: 'Empleado inactivo',
          action: 'logout_required'
        });
        return;
      }

      // Verificar si el empleado debe cambiar su contraseña
      if (employee.forcePasswordChange) {
        Logger.debug('Empleado debe cambiar su contraseña', { employeeId: employee._id });
        
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

      // Los permisos ya fueron cargados por AuthService.validateToken()
      // Solo asignar el empleado a la solicitud
      req.employee = employee as IEmployee;
      
      next();
    } catch (error) {
      // **LOGGING DETALLADO PARA DEBUG**
      Logger.error('❌ Error en validación de token', {
        route: req.originalUrl,
        method: req.method,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        tokenProvided: !!token,
        tokenLength: token ? token.length : 0,
        hasJwtSecret: !!process.env.JWT_SECRET
      });

      // Manejar errores de validación de token
      if (error instanceof Error && error.message.includes('Token inválido')) {
        Logger.warn('🚫 Token inválido en middleware', { 
          error: error.message,
          route: req.originalUrl
        });
        res.status(403).json({ 
          message: 'Token inválido',
          action: 'logout_required'
        });
        return;
      }
      
      if (error instanceof Error && error.message.includes('Sesión inválida')) {
        Logger.warn('⏰ Sesión inválida en middleware', { 
          error: error.message,
          route: req.originalUrl
        });
        res.status(401).json({ 
          message: 'Sesión expirada',
          action: 'logout_required'
        });
        return;
      }
      
      // Errores JWT específicos
      if (error instanceof JsonWebTokenError) {
        Logger.warn('🔑 Error JWT en middleware', { 
          error: error.message,
          jwtErrorName: error.name,
          route: req.originalUrl
        });
        res.status(403).json({ 
          message: 'Token inválido', 
          error: error.message,
          action: 'logout_required'
        });
        return;
      }
      
      Logger.error('💥 Error inesperado al validar token en middleware', error);
      console.error('❌ Middleware - Error detallado completo:', error);
      res.status(500).json({ 
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
      return;
    }
  } catch (error) {
    Logger.error('Error en middleware de autenticación', error);
    console.error('❌ Middleware - Error general:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// Middleware que verifica que el usuario tenga TODOS los permisos requeridos
export const checkPermissions = (requiredPermissions: string[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.employee) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    try {
      // Agregar logging detallado para debuggear
      console.log('🔍 DEBUG - checkPermissions middleware:', {
        employeeId: String(req.employee._id),
        employeeEmail: req.employee.email,
        employeeRole: req.employee.role,
        requiredPermissions,
        employeePermissions: req.employee.permissions,
        hasPermissionsLoaded: Array.isArray(req.employee.permissions) && req.employee.permissions.length > 0,
        route: req.originalUrl
      });

      const hasPermission = await PermissionService.hasAllPermissions(req.employee, requiredPermissions);
      
      // Si no tiene permisos, agregar logging adicional
      if (!hasPermission) {
        // Obtener permisos actuales del empleado para debugging
        const employeeId = req.employee._id instanceof mongoose.Types.ObjectId 
          ? req.employee._id.toString() 
          : String(req.employee._id);
        
        const actualPermissions = await PermissionService.getEmployeePermissions(employeeId);
        
        console.log('❌ DEBUG - Acceso denegado:', {
          employeeId,
          employeeEmail: req.employee.email,
          requiredPermissions,
          actualPermissions,
          missingPermissions: requiredPermissions.filter(p => !actualPermissions.includes(p)),
          route: req.originalUrl
        });
      }
      
      Logger.debug('Verificando permisos', {
        requiredPermissions,
        employeeId: String(req.employee._id),
        permissionsCount: req.employee.permissions?.length || 0,
        hasAllPermissions: hasPermission
      });
      
      if (!hasPermission) {
        Logger.warn('Acceso denegado - permisos insuficientes', {
          employeeId: String(req.employee._id),
          requiredPermissions,
          route: req.originalUrl
        });
        
        res.status(403).json({ 
          message: 'No autorizado', 
          requiredPermissions
        });
        return;
      }

      next();
    } catch (error) {
      Logger.error('Error al verificar permisos', error);
      res.status(500).json({ message: 'Error al verificar permisos' });
    }
  };
};

// Middleware que verifica que el usuario tenga AL MENOS UNO de los permisos requeridos
export const checkAnyPermissions = (requiredPermissions: string[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.employee) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    try {
      const hasAnyPermission = await PermissionService.hasAnyPermission(req.employee, requiredPermissions);
      
      Logger.debug('Verificando permisos (AL MENOS UNO)', {
        requiredPermissions,
        employeeId: String(req.employee._id),
        permissionsCount: req.employee.permissions?.length || 0,
        hasAnyPermission
      });
      
      if (!hasAnyPermission) {
        Logger.warn('Acceso denegado - sin permisos requeridos', {
          employeeId: String(req.employee._id),
          requiredPermissions,
          route: req.originalUrl
        });
        
        res.status(403).json({ 
          message: 'No autorizado', 
          requiredPermissions
        });
        return;
      }

      next();
    } catch (error) {
      Logger.error('Error al verificar permisos', error);
      res.status(500).json({ message: 'Error al verificar permisos' });
    }
  };
}; 