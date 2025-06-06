import { Request, Response, NextFunction } from 'express';
import Permission from '../models/Permission';

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