import Employee from '../models/Employee';
import jwt from 'jsonwebtoken';
import { IEmployee } from '../models/Employee';
import Role from '../models/Role';
import mongoose from 'mongoose';

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }
    return secret;
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
      const role = await Role.findOne(
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

      return employee;
    } catch (error) {
      console.error('Error en el registro:', error);
      throw error;
    }
  }

  static async getEmployeePermissions(employeeId: string): Promise<string[]> {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        console.log(`Empleado ${employeeId} no encontrado`);
        return [];
      }

      if (!employee.role) {
        console.log(`Empleado ${employeeId} no tiene rol asignado`);
        return [];
      }

      console.log(`Obteniendo permisos para empleado ${employeeId} con rol:`, employee.role);

      const role = await Role.findById(employee.role).populate('permissions');
      if (!role) {
        console.log(`Rol no encontrado para empleado ${employeeId}`);
        return [];
      }

      if (!role.isActive) {
        console.log(`Rol inactivo para empleado ${employeeId}`);
        return [];
      }

      const permissions = role.permissions
        .filter((permission: any) => permission.isActive)
        .map((permission: any) => `${permission.module}:${permission.action}`);

      console.log(`Permisos obtenidos para empleado ${employeeId}:`, permissions);
      return permissions;
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      return [];
    }
  }

  static async login(email: string, password: string, deviceInfo?: any): Promise<{ employee: IEmployee; token: string }> {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      throw new Error('Credenciales inválidas');
    }

    const isPasswordValid = await employee.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    if (!employee.isActive) {
      throw new Error('Cuenta inactiva');
    }

    const permissions = await this.getEmployeePermissions((employee as any)._id.toString());

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

    return { employee, token };
  }

  static async validateToken(token: string): Promise<IEmployee> {
    try {
      const jwtSecret = this.getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret) as { employeeId: string; role: string; permissions?: string[] };

      const employee = await Employee.findById(decoded.employeeId);
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }

      return employee;
    } catch (error) {
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
      throw new Error('Contraseña actual incorrecta');
    }
    employee.password = newPassword;
    await employee.save();
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
          console.log(`Sesión cerrada para empleado ${decoded.employeeId}`);
        }
      }
    } catch (error) {
      // Si hay error con el token, simplemente registramos y continuamos
      console.warn('Error al procesar logout:', error);
      // No lanzamos el error para permitir que el cliente continúe con el proceso de logout
    }
  }

  static async resetPassword(email: string): Promise<void> {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }
    // Implementar lógica de restablecimiento de contraseña
    // Por ejemplo, generar un token temporal y enviar un correo
  }
} 