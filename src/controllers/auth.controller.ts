import { Request, Response } from 'express';
import { AuthService } from '../services/employee-auth.service';
import Employee from '../models/Employee';
import { RequestHandler, NextFunction } from 'express';
import { createError } from '../utils/error';
import { logAuditAction } from '../utils/auditUtils';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const employee = await AuthService.register(req.body);
      res.status(201).json({
        message: 'Empleado registrado exitosamente',
        employee: {
          id: employee._id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.role
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      };

      const { employee, token } = await AuthService.login(email, password, deviceInfo);

      // Registrar auditoría del login
      await logAuditAction(
        req,
        'login',
        `Inicio de sesión exitoso: ${employee.firstName} ${employee.lastName}`,
        'empleado',
        (employee._id as any).toString(),
        undefined,
        {
          email: employee.email,
          loginTime: new Date(),
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        'autenticación'
      );

      res.json({
        message: 'Login exitoso',
        employee: {
          id: employee._id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.role
        },
        token
      });
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('Token no proporcionado');
      }

      // Obtener información del empleado antes del logout
      const employee = req.employee;
      
      await AuthService.logout(token);
      
      // Registrar auditoría del logout si tenemos información del empleado
      if (employee) {
        await logAuditAction(
          req,
          'logout',
          `Cierre de sesión: ${employee.firstName} ${employee.lastName}`,
          'empleado',
          (employee._id as any).toString(),
          undefined,
          {
            logoutTime: new Date(),
            ip: req.ip,
            userAgent: req.headers['user-agent']
          },
          'autenticación'
        );
      }
      
      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error: any) {
      res.status(400).json({
        message: 'Error al cerrar sesión',
        error: error.message
      });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const employeeId = (req as any).employee?._id;

      if (!employeeId) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      await AuthService.changePassword(employeeId, currentPassword, newPassword);
      
      // Registrar auditoría del cambio de contraseña
      const employee = req.employee;
      if (employee) {
        await logAuditAction(
          req,
          'actualización',
          `Cambio de contraseña: ${employee.firstName} ${employee.lastName}`,
          'empleado',
          (employee._id as any).toString(),
          undefined,
          { passwordChanged: true, changeTime: new Date() },
          'autenticación'
        );
      }
      
      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await AuthService.resetPassword(email);
      res.json({ message: 'Se ha enviado un correo con instrucciones para restablecer la contraseña' });
    } catch (error: any) {
      res.status(400).json({
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Obtiene la información del empleado autenticado
   */
  static async getCurrentEmployee(req: Request, res: Response) {
    try {
      console.log('🔍 getCurrentEmployee - Iniciando');
      
      if (!req.employee) {
        console.log('❌ getCurrentEmployee - No hay empleado en el request');
        return res.status(401).json({ message: 'No autenticado' });
      }

      console.log('🔍 getCurrentEmployee - Employee ID:', req.employee._id);

      const employee = await Employee.findById(req.employee._id)
        .select('-password')
        .populate('role');

      if (!employee) {
        console.log('❌ getCurrentEmployee - Empleado no encontrado en DB');
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }

      console.log('✅ getCurrentEmployee - Empleado encontrado:', employee.email);

      let permissions: string[] = [];
      try {
        permissions = await AuthService.getEmployeePermissions((employee._id as any).toString());
        console.log('✅ getCurrentEmployee - Permisos obtenidos:', permissions.length);
      } catch (permissionError) {
        console.error('⚠️ getCurrentEmployee - Error al obtener permisos:', permissionError);
        // Continuar sin permisos en lugar de fallar completamente
        permissions = [];
      }
      
      // Convertir el documento de Mongoose a un objeto simple
      const employeeObject = employee.toObject();
      
      // Agregar los permisos
      employeeObject.permissions = permissions;
      
      console.log('✅ getCurrentEmployee - Respuesta exitosa para:', employee.email);
      
      // Enviar todos los campos del empleado
      res.json(employeeObject);
    } catch (error: any) {
      console.error('❌ getCurrentEmployee - Error general:', error);
      console.error('❌ Stack trace:', error.stack);
      res.status(500).json({ 
        message: 'Error interno del servidor', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cambiar la contraseña del usuario cuando es forzado a hacerlo
   */
  static async changePasswordForced(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verificar que ambas contraseñas fueron proporcionadas
      if (!currentPassword || !newPassword) {
        return next(createError(400, 'La contraseña actual y la nueva contraseña son requeridas'));
      }
      
      // Obtener el ID del empleado autenticado
      const employeeId = req.employee?._id;
      if (!employeeId) {
        return next(createError(401, 'No autorizado'));
      }
      
      // Buscar el empleado en la base de datos
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return next(createError(404, 'Empleado no encontrado'));
      }
      
      // Verificar que la contraseña actual sea correcta
      const isMatch = await employee.comparePassword(currentPassword);
      if (!isMatch) {
        return next(createError(400, 'La contraseña actual es incorrecta'));
      }
      
      // Actualizar la contraseña
      employee.password = newPassword; // El middleware pre-save en el modelo se encargará del hash
      
      // Desactivar forcePasswordChange
      employee.forcePasswordChange = false;
      
      // Guardar los cambios
      await employee.save();
      
      // Registrar auditoría del cambio forzado de contraseña
      await logAuditAction(
        req,
        'actualización',
        `Cambio forzado de contraseña completado: ${employee.firstName} ${employee.lastName}`,
        'empleado',
        (employee._id as any).toString(),
        undefined,
        { forcedPasswordChange: true, changeTime: new Date() },
        'autenticación'
      );
      
      // Responder exitosamente
      res.json({ 
        message: 'Contraseña actualizada correctamente',
        forcePasswordChange: false
      });
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      next(createError(500, 'Error al cambiar la contraseña'));
    }
  }

  /**
   * Endpoint de diagnóstico para verificar la salud del sistema de autenticación
   */
  static async healthCheck(req: Request, res: Response) {
    try {
      console.log('🔍 AuthController - Health check iniciado');
      
      const checks = {
        database: false,
        employeeModel: false,
        roleModel: false,
        permissionService: false,
        jwtSecret: !!process.env.JWT_SECRET,
        mongoConnection: false
      };

      // Verificar conexión a la base de datos
      try {
        const mongoose = await import('mongoose');
        checks.mongoConnection = mongoose.connection.readyState === 1;
        console.log('✅ Health check - MongoDB connection:', checks.mongoConnection);
      } catch (error) {
        console.error('❌ Health check - Error conexión MongoDB:', error);
      }

      // Verificar modelos
      try {
        const testEmployee = await Employee.findOne().limit(1);
        checks.employeeModel = true;
        checks.database = true;
        console.log('✅ Health check - Employee model working');
      } catch (error) {
        console.error('❌ Health check - Error Employee model:', error);
      }

      try {
        const Role = await import('../models/Role');
        const testRole = await Role.default.findOne().limit(1);
        checks.roleModel = true;
        console.log('✅ Health check - Role model working');
      } catch (error) {
        console.error('❌ Health check - Error Role model:', error);
      }

      // Verificar servicio de permisos
      try {
        const { PermissionService } = await import('../services/permission.service');
        checks.permissionService = !!PermissionService;
        console.log('✅ Health check - Permission service available');
      } catch (error) {
        console.error('❌ Health check - Error Permission service:', error);
      }

      console.log('🔍 Health check results:', checks);

      res.json({
        status: 'Health check completed',
        checks,
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV
      });
    } catch (error: any) {
      console.error('❌ Health check - Error general:', error);
      res.status(500).json({
        status: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
} 