import Employee from '../models/Employee';
import Session from '../models/EmployeeSession';
import jwt from 'jsonwebtoken';
import { IEmployee } from '../models/Employee';
import mongoose from 'mongoose';
import { PermissionService } from './permission.service';
import Logger from '../utils/logger';

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }
    return secret;
  }

  // Método para obtener los permisos de un empleado - usa PermissionService
  static async getEmployeePermissions(employeeId: string): Promise<string[]> {
    return PermissionService.getEmployeePermissions(employeeId);
  }

  static async register(employeeData: Partial<IEmployee>): Promise<IEmployee> {
    try {
      let roleName = 'employee'; // Rol por defecto
      let roleId;

      // Si se proporciona un rol, verificar si es un ID válido o un nombre de rol
      if (employeeData.role && typeof employeeData.role === 'string' && !mongoose.Types.ObjectId.isValid(employeeData.role)) {
        roleName = employeeData.role;
        delete employeeData.role;
      }

      // Buscar el rol por nombre o ID
      const role = await mongoose.model('Role').findOne(
        mongoose.Types.ObjectId.isValid(employeeData.role as unknown as string)
          ? { _id: employeeData.role }
          : { name: roleName }
      );

      if (!role) {
        throw new Error('Rol no encontrado');
      }

      roleId = role._id;

      // Crear un nuevo objeto employeeData con el rol asignado
      const employeeDataWithRole = {
        ...employeeData,
        role: roleId
      };

      const employee = new Employee(employeeDataWithRole);
      await employee.save();

      Logger.info('Nuevo empleado registrado', {
        id: employee._id,
        email: employee.email,
        role: roleId
      });

      return employee;
    } catch (error) {
      Logger.error('Error en el registro de empleado', error);
      throw error;
    }
  }

  static async login(email: string, password: string, deviceInfo?: any): Promise<{ employee: IEmployee; token: string }> {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      Logger.warn('Intento de login con credenciales inválidas', { email });
      throw new Error('Credenciales inválidas');
    }

    const isPasswordValid = await employee.comparePassword(password);
    if (!isPasswordValid) {
      Logger.warn('Intento de login con contraseña incorrecta', { email });
      throw new Error('Credenciales inválidas');
    }

    if (!employee.isActive) {
      Logger.warn('Intento de login con cuenta inactiva', { email, employeeId: employee._id });
      throw new Error('Cuenta inactiva');
    }

    // Obtener permisos utilizando el servicio unificado
    try {
      const employeeId = String(employee._id);
      const permissions = await PermissionService.getEmployeePermissions(employeeId);

      const token = jwt.sign(
        {
          employeeId: employee._id,
          role: employee.role,
          permissions
        },
        this.getJwtSecret(),
        { expiresIn: '24h' }
      );

      // Actualizar último acceso
      employee.lastLogin = new Date();
      await employee.save();
      
      // Crear o actualizar sesión
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24); // 24 horas
      
      const session = await Session.create({
        userId: employee._id,
        token,
        expiresAt: expirationDate,
        deviceInfo: {
          userAgent: deviceInfo?.userAgent || 'Desconocido',
          ipAddress: deviceInfo?.ip || 'Desconocido'
        },
        isActive: true
      });
      
      Logger.auth('Login exitoso', {
        employeeId: employee._id,
        sessionId: session._id,
        expirationDate
      });

      return { employee, token };
    } catch (error) {
      Logger.error('Error al obtener permisos durante login', error, { employeeId: employee._id });
      
      // Crear token sin permisos en caso de error
      const token = jwt.sign(
        {
          employeeId: employee._id,
          role: employee.role,
          permissions: []
        },
        this.getJwtSecret(),
        { expiresIn: '24h' }
      );
      
      // Actualizar último acceso
      employee.lastLogin = new Date();
      await employee.save();
      
      // Crear o actualizar sesión
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24); // 24 horas
      
      const session = await Session.create({
        userId: employee._id,
        token,
        expiresAt: expirationDate,
        deviceInfo: {
          userAgent: deviceInfo?.userAgent || 'Desconocido',
          ipAddress: deviceInfo?.ip || 'Desconocido'
        },
        isActive: true
      });
      
      Logger.warn('Login exitoso pero sin permisos debido a error', {
        employeeId: employee._id,
        sessionId: session._id,
        expirationDate
      });
      
      return { employee, token };
    }
  }

  static async validateToken(token: string): Promise<{ employee: IEmployee; newToken?: string }> {
    try {
      const jwtSecret = this.getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret) as { employeeId: string; role: string; permissions?: string[]; iat: number; exp: number };

      const employee = await Employee.findById(decoded.employeeId);
      if (!employee) {
        Logger.warn('Token válido pero empleado no encontrado', { employeeId: decoded.employeeId });
        throw new Error('Empleado no encontrado');
      }
      
      // Verificar si existe una sesión activa
      const session = await Session.findOne({
        token,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        Logger.warn('Sesión inválida o expirada', { employeeId: decoded.employeeId });
        throw new Error('Sesión inválida o expirada');
      }
      
      let newToken: string | undefined;
      const now = new Date();
      const tokenExpiry = new Date(decoded.exp * 1000); // exp viene en segundos, convertir a ms
      const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
      const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
      
      // MEJORADO: Renovar token si queda menos de 12 horas (50% del tiempo)
      // Y siempre renovar sesiones de más de 3 días para usuarios activos
      const shouldRenewToken = hoursUntilExpiry < 12 || 
                              (now.getTime() - session.createdAt.getTime()) > (3 * 24 * 60 * 60 * 1000);
      
      if (shouldRenewToken) {
        try {
          // Cargar permisos actualizados para el nuevo token
          const employeeId = String(employee._id);
          const permissions = await PermissionService.getEmployeePermissions(employeeId);
          
          // Generar NUEVO token JWT con nueva fecha de expiración
          newToken = jwt.sign(
            {
              employeeId: employee._id,
              role: employee.role,
              permissions
            },
            jwtSecret,
            { expiresIn: '24h' }
          );
          
          // Actualizar sesión con el nuevo token y nueva expiración
          const newExpirationDate = new Date();
          newExpirationDate.setHours(newExpirationDate.getHours() + 24);
          
          // Actualizar la sesión existente con el nuevo token
          session.token = newToken;
          session.expiresAt = newExpirationDate;
          await session.save();
          
          Logger.info('Token y sesión renovados automáticamente', {
            employeeId: employee._id,
            sessionId: session._id,
            oldTokenExpiry: tokenExpiry,
            newExpirationDate,
            hoursUntilOldExpiry: hoursUntilExpiry.toFixed(2)
          });
          
          // Asignar permisos al objeto employee
          (employee as any).permissions = permissions;
          
        } catch (error) {
          Logger.error('Error durante renovación automática de token', error, { 
            employeeId: employee._id 
          });
          // Continuar con el token actual si falla la renovación
        }
      }

      // Cargar permisos si no los tiene y no se renovó el token
      if (!newToken && (!Array.isArray(employee.permissions) || employee.permissions.length === 0)) {
        try {
          const employeeId = String(employee._id);
          const permissions = await PermissionService.getEmployeePermissions(employeeId);
          (employee as any).permissions = permissions;
        } catch (error) {
          Logger.warn('No se pudieron cargar los permisos durante la validación del token', { 
            employeeId: employee._id,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continuar sin permisos
          (employee as any).permissions = [];
        }
      }

      return { employee, newToken };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        Logger.warn('Token JWT inválido', { error: error.message });
      } else {
        Logger.error('Error validando token', error);
      }
      throw new Error('Token inválido');
    }
  }

  static async changePassword(employeeId: string, currentPassword: string, newPassword: string): Promise<void> {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }
    const isPasswordValid = await employee.comparePassword(currentPassword);
    if (!isPasswordValid) {
      Logger.warn('Intento de cambio de contraseña con contraseña actual incorrecta', { employeeId });
      throw new Error('Contraseña actual incorrecta');
    }
    employee.password = newPassword;
    await employee.save();
    Logger.info('Contraseña cambiada exitosamente', { employeeId });
  }

  static async logout(token: string): Promise<void> {
    try {
      // Verificar el token para obtener el ID del empleado
      const jwtSecret = this.getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret) as { employeeId: string };
      
      if (decoded && decoded.employeeId) {
        // Registrar la actividad de cierre de sesión
        const employee = await Employee.findById(decoded.employeeId);
        if (employee) {
          employee.lastLogout = new Date();
          await employee.save();
          Logger.debug('Hora de cierre de sesión actualizada', { employeeId: decoded.employeeId });
        }
        
        // Marcar la sesión como inactiva
        const updatedSession = await Session.findOneAndUpdate(
          { token, isActive: true },
          { isActive: false },
          { new: true }
        );
        
        if (updatedSession) {
          Logger.debug('Sesión marcada como inactiva', { 
            sessionId: updatedSession._id,
            employeeId: decoded.employeeId
          });
        } else {
          Logger.warn('No se encontró una sesión activa con el token proporcionado', { 
            employeeId: decoded.employeeId 
          });
        }
      }
    } catch (error) {
      // Si hay error con el token, simplemente registramos y continuamos
      Logger.warn('Error al procesar logout', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // No lanzamos el error para permitir que el cliente continúe con el proceso de logout
    }
  }

  static async resetPassword(email: string): Promise<void> {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      Logger.warn('Intento de restablecer contraseña para cuenta inexistente', { email });
      throw new Error('Empleado no encontrado');
    }
    // Implementar lógica de restablecimiento de contraseña
    // Por ejemplo, generar un token temporal y enviar un correo
    Logger.info('Solicitud de restablecimiento de contraseña iniciada', { employeeId: employee._id });
  }
  
  // Obtener sesiones activas de un empleado
  static async getActiveSessions(employeeId: string): Promise<any[]> {
    try {
      const sessions = await Session.find({ 
        userId: new mongoose.Types.ObjectId(employeeId),
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).lean();
      
      Logger.debug('Sesiones activas recuperadas', { 
        employeeId, 
        sessionsCount: sessions.length 
      });
      
      return sessions;
    } catch (error) {
      Logger.error('Error al obtener sesiones activas', { 
        employeeId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }
} 