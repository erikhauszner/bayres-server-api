import { Request, Response } from 'express';
import { PartnerDistribution } from '../../models/Finance';
import mongoose from 'mongoose';

export class PartnerDistributionController {
  /**
   * Obtener todas las distribuciones por socio
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { partnerId, distributionId } = req.query;
      
      let query: any = { isActive: { $ne: false } };
      
      // Filtrar por socio si se proporciona
      if (partnerId && mongoose.Types.ObjectId.isValid(partnerId as string)) {
        query.partnerId = partnerId;
      }
      
      // Filtrar por distribución si se proporciona
      if (distributionId && mongoose.Types.ObjectId.isValid(distributionId as string)) {
        query.distributionId = distributionId;
      }
      
      const partnerDistributions = await PartnerDistribution.find(query)
        .populate('partnerId', 'name position participation')
        .populate('distributionId', 'period date status')
        .sort({ date: -1 });
      
      res.status(200).json(partnerDistributions);
    } catch (error) {
      console.error('Error al obtener distribuciones por socio:', error);
      res.status(500).json({ message: 'Error al obtener distribuciones por socio' });
    }
  }

  /**
   * Obtener una distribución por socio por ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de distribución por socio inválido' });
      }

      const partnerDistribution = await PartnerDistribution.findById(id)
        .populate('partnerId', 'name position participation')
        .populate('distributionId', 'period date status');

      if (!partnerDistribution || partnerDistribution.isActive === false) {
        return res.status(404).json({ message: 'Distribución por socio no encontrada' });
      }

      res.status(200).json(partnerDistribution);
    } catch (error) {
      console.error(`Error al obtener distribución por socio por ID:`, error);
      res.status(500).json({ message: 'Error al obtener distribución por socio' });
    }
  }

  /**
   * Actualizar una distribución por socio existente
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de distribución por socio inválido' });
      }

      const partnerDistribution = await PartnerDistribution.findById(id);

      if (!partnerDistribution || partnerDistribution.isActive === false) {
        return res.status(404).json({ message: 'Distribución por socio no encontrada' });
      }

      // Verificar si se intenta cambiar el estado a "pagado"
      if (updates.status === 'paid' && partnerDistribution.status !== 'paid') {
        // Actualizar los dividendos acumulados del socio si se marca como pagado
        const Partner = mongoose.model('Partner');
        const partner = await Partner.findById(partnerDistribution.partnerId);
        
        if (partner) {
          const dividendsYTD = (partner.dividendsYTD || 0) + partnerDistribution.amount;
          await Partner.findByIdAndUpdate(
            partnerDistribution.partnerId,
            { dividendsYTD }
          );
        }
      }

      // Actualizar campos
      const updatedPartnerDistribution = await PartnerDistribution.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .populate('partnerId', 'name position participation')
        .populate('distributionId', 'period date status');

      res.status(200).json(updatedPartnerDistribution);
    } catch (error) {
      console.error(`Error al actualizar distribución por socio:`, error);
      
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.message
        });
      }
      
      res.status(500).json({ message: 'Error al actualizar distribución por socio' });
    }
  }

  /**
   * Obtener distribuciones por socio para un socio específico
   */
  static async getByPartner(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        return res.status(400).json({ message: 'ID de socio inválido' });
      }

      const partnerDistributions = await PartnerDistribution.find({
        partnerId,
        isActive: { $ne: false }
      })
        .populate('distributionId', 'period date status totalAmount')
        .sort({ date: -1 });

      res.status(200).json(partnerDistributions);
    } catch (error) {
      console.error(`Error al obtener distribuciones para el socio:`, error);
      res.status(500).json({ message: 'Error al obtener distribuciones para el socio' });
    }
  }

  /**
   * Obtener distribuciones por socio para una distribución específica
   */
  static async getByDistribution(req: Request, res: Response) {
    try {
      const { distributionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(distributionId)) {
        return res.status(400).json({ message: 'ID de distribución inválido' });
      }

      const partnerDistributions = await PartnerDistribution.find({
        distributionId,
        isActive: { $ne: false }
      })
        .populate('partnerId', 'name position participation')
        .sort({ date: -1 });

      res.status(200).json(partnerDistributions);
    } catch (error) {
      console.error(`Error al obtener distribuciones por socio para la distribución:`, error);
      res.status(500).json({ message: 'Error al obtener distribuciones por socio para la distribución' });
    }
  }
} 