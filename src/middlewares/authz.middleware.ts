import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/employee-auth.service';

export const authorize = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.employee) {
        res.status(401).json({ message: 'No autenticado' });
        return;
      }

      const permissions = await AuthService.getEmployeePermissions((req.employee as any)._id.toString());
      const hasPermission = requiredPermissions.every(permission => 
        permissions.includes(permission)
      );

      if (!hasPermission) {
        res.status(403).json({ message: 'No autorizado' });
        return;
      }

      next();
    } catch (error) {
      console.error('Error en autorización:', error);
      res.status(500).json({ message: 'Error al verificar permisos' });
      return;
    }
  };
}; 