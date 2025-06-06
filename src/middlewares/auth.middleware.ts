import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/employee-auth.service';
import { IEmployee } from '../models/Employee';

declare global {
  namespace Express {
    interface Request {
      employee?: IEmployee;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    const employee = await AuthService.validateToken(token);
    req.employee = employee;
    next();
  } catch (error: any) {
    res.status(401).json({ message: 'No autorizado', error: error.message });
  }
}; 