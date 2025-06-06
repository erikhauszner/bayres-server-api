import { Request, Response, NextFunction } from 'express';
import Employee from '../models/Employee';
import Role from '../models/Role';
import mongoose from 'mongoose';

export class EmployeePermissionController {
  /**
   * Obtiene los permisos de un empleado
   */
  static async getEmployeePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.params.id;
      
      // Verificar que el ID sea válido
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'ID de empleado no válido' });
      }
      
      // Obtener el empleado con su rol
      const employee = await Employee.findById(employeeId).select('-password');
      if (!employee) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }
      
      // Obtener el rol con sus permisos
      const role = await Role.findById(employee.role).populate('permissions');
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      // Extraer información de permisos
      const permissions = role.permissions.map((p: any) => ({
        id: p._id,
        name: p.name,
        module: p.module,
        action: p.action,
        description: p.description,
        isActive: p.isActive
      }));
      
      res.json({
        employee: {
          id: employee._id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
        },
        role: {
          id: role._id,
          name: role.name,
          description: role.description
        },
        permissions
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Actualiza el rol y permisos de un empleado
   */
  static async updateEmployeePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.params.id;
      const { roleId } = req.body;
      
      // Verificar que los IDs sean válidos
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'ID de empleado no válido' });
      }
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      // Verificar que el rol existe
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      // Actualizar el rol del empleado
      const employee = await Employee.findByIdAndUpdate(
        employeeId,
        { role: roleId },
        { new: true }
      ).select('-password');
      
      if (!employee) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }
      
      res.json({
        message: 'Permisos de empleado actualizados correctamente',
        employee: {
          id: employee._id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: roleId
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 