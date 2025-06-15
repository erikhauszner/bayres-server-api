import { Request, Response, NextFunction } from 'express';
import { FinancialAccount, IFinancialAccount } from '../../models/Finance';
import { logAuditAction, sanitizeDataForAudit } from '../../utils/auditUtils';

export class FinancialAccountController {
  /**
   * Obtener todas las cuentas financieras
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const accounts = await FinancialAccount.find({ isActive: true })
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName');

      res.json(accounts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener una cuenta financiera por ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const account = await FinancialAccount.findById(id)
        .populate('createdBy', 'firstName lastName');
      
      if (!account) {
        return res.status(404).json({ message: 'Cuenta no encontrada' });
      }
      
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear una nueva cuenta financiera
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id || req.user?._id;
      
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autorizado' });
      }
      
      const {
        name,
        type,
        initialBalance,
        currency,
        accountNumber,
        bankName,
        description
      } = req.body;
      
      // Verificar si ya existe una cuenta con el mismo nombre
      const existingAccount = await FinancialAccount.findOne({ name });
      if (existingAccount) {
        return res.status(400).json({ message: 'Ya existe una cuenta con este nombre' });
      }
      
      // Crear la cuenta
      const account = new FinancialAccount({
        name,
        type,
        initialBalance,
        balance: initialBalance,
        currency,
        accountNumber,
        bankName,
        description,
        createdBy: employeeId
      });
      
      await account.save();
      
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar una cuenta financiera
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Si se está actualizando el nombre, verificar que no exista otro con ese nombre
      if (updateData.name) {
        const existingAccount = await FinancialAccount.findOne({ 
          name: updateData.name, 
          _id: { $ne: id } 
        });
        
        if (existingAccount) {
          return res.status(400).json({ message: 'Ya existe otra cuenta con este nombre' });
        }
      }
      
      // Si se actualiza el saldo inicial, recalcular el saldo actual
      if (updateData.initialBalance !== undefined) {
        const account = await FinancialAccount.findById(id);
        if (account) {
          const balanceDiff = updateData.initialBalance - account.initialBalance;
          updateData.balance = account.balance + balanceDiff;
        }
      }
      
      const account = await FinancialAccount.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'firstName lastName');
      
      if (!account) {
        return res.status(404).json({ message: 'Cuenta no encontrada' });
      }
      
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar el saldo de una cuenta
   */
  static async updateBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount, operation } = req.body;
      
      if (!amount || !operation) {
        return res.status(400).json({ message: 'Se requiere el monto y la operación' });
      }
      
      const account = await FinancialAccount.findById(id);
      
      if (!account) {
        return res.status(404).json({ message: 'Cuenta no encontrada' });
      }
      
      // Actualizar el saldo
      if (operation === 'add') {
        account.balance += amount;
      } else if (operation === 'subtract') {
        account.balance -= amount;
      } else {
        return res.status(400).json({ message: 'Operación no válida' });
      }
      
      await account.save();
      
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar una cuenta financiera (desactivar)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const account = await FinancialAccount.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );
      
      if (!account) {
        return res.status(404).json({ message: 'Cuenta no encontrada' });
      }
      
      res.json({ message: 'Cuenta eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
} 