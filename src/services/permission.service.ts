import mongoose from 'mongoose';
import Employee from '../models/Employee';
import Role from '../models/Role';
import { IEmployee } from '../models/Employee';

export class PermissionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class PermissionService {
  /**
   * Obtiene los permisos de un empleado por su ID
   * @param employeeId ID del empleado
   * @returns Array de permisos en formato 'module:action'
   * @throws PermissionError si hay problemas al obtener permisos
   */
  static async getEmployeePermissions(employeeId: string): Promise<string[]> {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new PermissionError(`Empleado ${employeeId} no encontrado`, 'EMPLOYEE_NOT_FOUND');
      }

      if (!employee.role) {
        throw new PermissionError(`Empleado ${employeeId} no tiene rol asignado`, 'NO_ROLE_ASSIGNED');
      }

      const roleId = employee.role;
      return this.getRolePermissions(roleId);
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      throw new PermissionError(`Error al obtener permisos del empleado: ${(error as Error).message}`, 'PERMISSION_ERROR');
    }
  }

  /**
   * Obtiene los permisos asociados a un rol
   * @param roleId ID del rol o instancia del rol
   * @returns Array de permisos en formato 'module:action'
   * @throws PermissionError si hay problemas al obtener permisos
   */
  static async getRolePermissions(roleId: mongoose.Types.ObjectId | string): Promise<string[]> {
    try {
      const role = await Role.findById(roleId).populate('permissions');
      
      if (!role) {
        throw new PermissionError(`Rol ${roleId} no encontrado`, 'ROLE_NOT_FOUND');
      }

      if (!role.isActive) {
        throw new PermissionError(`Rol ${roleId} inactivo`, 'INACTIVE_ROLE');
      }

      if (!role.permissions || !Array.isArray(role.permissions)) {
        throw new PermissionError(`Rol ${roleId} no tiene permisos definidos correctamente`, 'INVALID_PERMISSIONS');
      }

      const permissionStrings = role.permissions
        .filter((permission: any) => permission.isActive)
        .map((permission: any) => `${permission.module}:${permission.action}`);

      return permissionStrings;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      throw new PermissionError(`Error al obtener permisos del rol: ${(error as Error).message}`, 'PERMISSION_ERROR');
    }
  }

  /**
   * Verifica si un empleado tiene un permiso específico
   * @param employee Empleado a verificar
   * @param module Módulo del permiso
   * @param action Acción del permiso
   * @returns true si tiene el permiso, false si no
   */
  static async hasPermission(employee: IEmployee, module: string, action: string): Promise<boolean> {
    try {
      const permissionToCheck = `${module}:${action}`;
      
      // Si el empleado ya tiene los permisos cargados, verificar directamente
      if (Array.isArray(employee.permissions) && employee.permissions.length > 0) {
        return employee.permissions.includes(permissionToCheck);
      }
      
      // Si no tiene permisos cargados, obtenerlos desde la base de datos
      const employeeId = employee._id instanceof mongoose.Types.ObjectId 
        ? employee._id.toString() 
        : String(employee._id);
        
      const permissions = await this.getEmployeePermissions(employeeId);
      return permissions.includes(permissionToCheck);
    } catch (error) {
      // En caso de error, asumir que no tiene permisos por seguridad
      console.error('Error al verificar permiso:', error);
      return false;
    }
  }

  /**
   * Verifica si un empleado tiene todos los permisos especificados
   * @param employee Empleado a verificar
   * @param permissionsToCheck Lista de permisos a verificar
   * @returns true si tiene todos los permisos, false si falta alguno
   */
  static async hasAllPermissions(employee: IEmployee, permissionsToCheck: string[]): Promise<boolean> {
    try {
      // Si el empleado ya tiene los permisos cargados, verificar directamente
      if (Array.isArray(employee.permissions) && employee.permissions.length > 0) {
        return permissionsToCheck.every(permission => employee.permissions.includes(permission));
      }
      
      // Si no tiene permisos cargados, obtenerlos desde la base de datos
      const employeeId = employee._id instanceof mongoose.Types.ObjectId 
        ? employee._id.toString() 
        : String(employee._id);
        
      const permissions = await this.getEmployeePermissions(employeeId);
      return permissionsToCheck.every(permission => permissions.includes(permission));
    } catch (error) {
      // En caso de error, asumir que no tiene permisos por seguridad
      console.error('Error al verificar permisos múltiples:', error);
      return false;
    }
  }

  /**
   * Verifica si un empleado tiene al menos uno de los permisos especificados
   * @param employee Empleado a verificar
   * @param permissionsToCheck Lista de permisos a verificar
   * @returns true si tiene al menos uno de los permisos, false si no tiene ninguno
   */
  static async hasAnyPermission(employee: IEmployee, permissionsToCheck: string[]): Promise<boolean> {
    try {
      // Si el empleado ya tiene los permisos cargados, verificar directamente
      if (Array.isArray(employee.permissions) && employee.permissions.length > 0) {
        return permissionsToCheck.some(permission => employee.permissions.includes(permission));
      }
      
      // Si no tiene permisos cargados, obtenerlos desde la base de datos
      const employeeId = employee._id instanceof mongoose.Types.ObjectId 
        ? employee._id.toString() 
        : String(employee._id);
        
      const permissions = await this.getEmployeePermissions(employeeId);
      return permissionsToCheck.some(permission => permissions.includes(permission));
    } catch (error) {
      // En caso de error, asumir que no tiene permisos por seguridad
      console.error('Error al verificar permisos múltiples:', error);
      return false;
    }
  }
} 