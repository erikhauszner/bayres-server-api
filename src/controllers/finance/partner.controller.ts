import { Request, Response } from 'express';
import { Partner } from '../../models/Finance';
import mongoose from 'mongoose';
import { logAuditAction, sanitizeDataForAudit } from '../../utils/auditUtils';

export class PartnerController {
  /**
   * Obtener todos los socios
   */
  static async getAll(req: Request, res: Response) {
    try {
      const partners = await Partner.find({ isActive: { $ne: false } }).sort({ name: 1 });
      res.status(200).json(partners);
    } catch (error) {
      console.error('Error al obtener socios:', error);
      res.status(500).json({ message: 'Error al obtener socios' });
    }
  }

  /**
   * Obtener un socio por ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de socio inválido' });
      }

      const partner = await Partner.findById(id);

      if (!partner || partner.isActive === false) {
        return res.status(404).json({ message: 'Socio no encontrado' });
      }

      res.status(200).json(partner);
    } catch (error) {
      console.error(`Error al obtener socio por ID:`, error);
      res.status(500).json({ message: 'Error al obtener socio' });
    }
  }

  /**
   * Crear un nuevo socio
   */
  static async create(req: Request, res: Response) {
    try {
      const partnerData = req.body;

      const newPartner = new Partner(partnerData);
      await newPartner.save();

      res.status(201).json(newPartner);
    } catch (error) {
      console.error('Error al crear socio:', error);
      
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.message
        });
      }
      
      res.status(500).json({ message: 'Error al crear socio' });
    }
  }

  /**
   * Actualizar un socio existente
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de socio inválido' });
      }

      const partner = await Partner.findById(id);

      if (!partner || partner.isActive === false) {
        return res.status(404).json({ message: 'Socio no encontrado' });
      }

      // Actualizar campos
      const updatedPartner = await Partner.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      res.status(200).json(updatedPartner);
    } catch (error) {
      console.error(`Error al actualizar socio:`, error);
      
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.message
        });
      }
      
      res.status(500).json({ message: 'Error al actualizar socio' });
    }
  }

  /**
   * Eliminar un socio (marcar como inactivo)
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de socio inválido' });
      }

      const partner = await Partner.findById(id);

      if (!partner || partner.isActive === false) {
        return res.status(404).json({ message: 'Socio no encontrado' });
      }

      // Marcar como inactivo en lugar de eliminar físicamente
      await Partner.findByIdAndUpdate(id, { isActive: false });

      res.status(200).json({ message: 'Socio eliminado correctamente' });
    } catch (error) {
      console.error(`Error al eliminar socio:`, error);
      res.status(500).json({ message: 'Error al eliminar socio' });
    }
  }
} 