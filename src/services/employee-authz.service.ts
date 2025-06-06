import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import Employee, { IEmployee } from '../models/Employee';
import Role from '../models/Role';
import Permission from '../models/Permission';
import mongoose from 'mongoose';

interface JwtPayload {
  userId: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: IEmployee;
    }
  }
}

export class AuthzService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'ee5392100b78a16228abdf0bfc473cb987322f326a1e18f00f9be83704e19dc1';

  // Middleware de autenticación
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ee5392100b78a16228abdf0bfc473cb987322f326a1e18f00f9be83704e19dc1') as JwtPayload;
      
      // Buscar el empleado completo en la base de datos
      const employee = await Employee.findById(new Types.ObjectId(decoded.userId));
      if (!employee) {
        return res.status(401).json({ message: 'Empleado no encontrado' });
      }

      req.user = employee;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Token inválido' });
    }
  }

  // Middleware de autorización
  static authorize(requiredPermissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const hasPermission = requiredPermissions.every(permission => 
        req.user?.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'No autorizado' });
      }

      next();
    };
  }

  static async checkPermission(employee: IEmployee, module: string, action: string): Promise<boolean> {
    try {
      // Si el empleado no tiene rol, no tiene permisos
      if (!employee.role) {
        return false;
      }

      // Obtener el rol del empleado con sus permisos
      const role = await Role.findById(employee.role).populate('permissions');
      if (!role || !role.isActive) {
        return false;
      }

      // Verificar si el rol tiene el permiso requerido
      const hasPermission = role.permissions.some((permission: any) => 
        permission.module === module && 
        permission.action === action && 
        permission.isActive
      );

      return hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Función para reinicializar permisos del rol admin
  static async resetAdminPermissions(): Promise<void> {
    try {
      console.log('Iniciando reinicialización de permisos del rol admin...');
      
      // Buscar el rol admin
      const adminRole = await Role.findOne({ name: 'admin' });
      if (!adminRole) {
        console.error('Rol admin no encontrado');
        return;
      }
      
      console.log(`Rol admin encontrado: ${adminRole._id}`);
      
      // Obtener todos los permisos existentes
      const allPermissions = await Permission.find({ isActive: true });
      if (!allPermissions || allPermissions.length === 0) {
        console.error('No se encontraron permisos activos en el sistema');
        return;
      }
      
      console.log(`Se encontraron ${allPermissions.length} permisos activos`);
      
      // Asignar todos los permisos al rol admin
      adminRole.permissions = allPermissions.map(p => p._id) as mongoose.Types.ObjectId[];
      await adminRole.save();
      
      console.log('Permisos del rol admin actualizados correctamente');
      console.log(`Número de permisos asignados: ${adminRole.permissions.length}`);
    } catch (error) {
      console.error('Error al reinicializar permisos del rol admin:', error);
      throw error;
    }
  }

  static async initializeSystemRoles(): Promise<void> {
    try {
      // Verificar si ya existen roles del sistema
      const existingRoles = await Role.find({ isSystem: true });
      if (existingRoles.length > 0) {
        console.log('Los roles del sistema ya están inicializados');
        return;
      }

      // Crear permisos base
      const permissions = await Permission.create([
        // Permisos de autenticación
        { name: 'auth_login', description: 'Permiso para iniciar sesión', module: 'auth', action: 'read' },
        { name: 'auth_logout', description: 'Permiso para cerrar sesión', module: 'auth', action: 'read' },
        { name: 'auth_register', description: 'Permiso para registrar usuarios', module: 'auth', action: 'create' },
        
        // Permisos de empleados
        { name: 'employees_read', description: 'Permiso para ver empleados', module: 'employees', action: 'read' },
        { name: 'employees_create', description: 'Permiso para crear empleados', module: 'employees', action: 'create' },
        { name: 'employees_update', description: 'Permiso para actualizar empleados', module: 'employees', action: 'update' },
        { name: 'employees_delete', description: 'Permiso para eliminar empleados', module: 'employees', action: 'delete' },
        
        // Permisos de roles
        { name: 'roles_read', description: 'Permiso para ver roles', module: 'roles', action: 'read' },
        { name: 'roles_create', description: 'Permiso para crear roles', module: 'roles', action: 'create' },
        { name: 'roles_update', description: 'Permiso para actualizar roles', module: 'roles', action: 'update' },
        { name: 'roles_delete', description: 'Permiso para eliminar roles', module: 'roles', action: 'delete' },
        
        // Permisos de clientes
        { name: 'clients_read', description: 'Permiso para ver clientes', module: 'clients', action: 'read' },
        { name: 'clients_create', description: 'Permiso para crear clientes', module: 'clients', action: 'create' },
        { name: 'clients_update', description: 'Permiso para actualizar clientes', module: 'clients', action: 'update' },
        { name: 'clients_delete', description: 'Permiso para eliminar clientes', module: 'clients', action: 'delete' },
        { name: 'clients_convert_to_lead', description: 'Permiso para convertir clientes a leads', module: 'clients', action: 'convert_to_lead' },
        
        // Permisos de leads
        { name: 'leads_read', description: 'Permiso para ver leads', module: 'leads', action: 'read' },
        { name: 'leads_create', description: 'Permiso para crear leads', module: 'leads', action: 'create' },
        { name: 'leads_update', description: 'Permiso para actualizar leads', module: 'leads', action: 'update' },
        { name: 'leads_delete', description: 'Permiso para eliminar leads', module: 'leads', action: 'delete' },
        { name: 'leads_convert_to_client', description: 'Permiso para convertir leads a clientes', module: 'leads', action: 'convert_to_client' }
      ]);

      // Limpiar los roles existentes si hay alguno
      await Role.deleteMany({});

      // Crear roles del sistema
      await Role.create([
        {
          name: 'admin',
          description: 'Administrador del sistema con acceso total',
          permissions: permissions.map(p => p._id),
          isActive: true,
          isSystem: true
        },
        {
          name: 'manager',
          description: 'Gerente con acceso a gestión de empleados y leads',
          permissions: permissions
            .filter(p => ['auth', 'employees', 'leads'].includes(p.module))
            .map(p => p._id),
          isActive: true,
          isSystem: true
        },
        {
          name: 'appointment_setter',
          description: 'Agente de citas con acceso a leads y actividades',
          permissions: permissions
            .filter(p => ['auth', 'leads', 'activities'].includes(p.module) && p.action !== 'delete')
            .map(p => p._id),
          isActive: true,
          isSystem: true
        },
        {
          name: 'client',
          description: 'Cliente con acceso limitado a su información',
          permissions: permissions
            .filter(p => p.module === 'auth' && p.action === 'read')
            .map(p => p._id),
          isActive: true,
          isSystem: true
        },
        {
          name: 'user',
          description: 'Usuario estándar',
          permissions: permissions
            .filter(p => (p.module === 'employees' && p.action === 'read') || 
                         (p.module === 'clients' && ['read', 'create', 'update'].includes(p.action)) ||
                         (p.module === 'auth' && p.action === 'read'))
            .map(p => p._id),
          isActive: true,
          isSystem: true
        }
      ]);

      console.log('Roles y permisos del sistema inicializados correctamente');
    } catch (error) {
      console.error('Error inicializando roles y permisos:', error);
      throw error;
    }
  }
} 