import { Request, Response, NextFunction } from 'express';
import Permission from '../models/Permission';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

export class PermissionController {
  /**
   * Obtiene todos los permisos
   */
  static async getPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await Permission.find()
        .select('-__v');
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }
} 