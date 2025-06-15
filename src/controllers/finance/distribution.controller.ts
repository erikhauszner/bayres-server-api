import { Request, Response } from 'express';
import { Distribution, Partner, PartnerDistribution } from '../../models/Finance';
import mongoose from 'mongoose';
import { logAuditAction, sanitizeDataForAudit } from '../../utils/auditUtils';

export class DistributionController {
  /**
   * Obtener todas las distribuciones
   */
  static async getAll(req: Request, res: Response) {
    try {
      const distributions = await Distribution.find({ isActive: { $ne: false } })
        .sort({ date: -1 });
      res.status(200).json(distributions);
    } catch (error) {
      console.error('Error al obtener distribuciones:', error);
      res.status(500).json({ message: 'Error al obtener distribuciones' });
    }
  }

  /**
   * Obtener una distribución por ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de distribución inválido' });
      }

      const distribution = await Distribution.findById(id);

      if (!distribution || distribution.isActive === false) {
        return res.status(404).json({ message: 'Distribución no encontrada' });
      }

      res.status(200).json(distribution);
    } catch (error) {
      console.error(`Error al obtener distribución por ID:`, error);
      res.status(500).json({ message: 'Error al obtener distribución' });
    }
  }

  /**
   * Crear una nueva distribución
   */
  static async create(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const distributionData = req.body;
      const { partners = [] } = distributionData;

      // Crear la distribución principal
      const newDistribution = new Distribution(distributionData);
      await newDistribution.save({ session });

      // Obtener socios activos si no se proporcionaron
      let partnersList = partners;
      if (!partnersList.length) {
        partnersList = await Partner.find({ 
          status: 'active', 
          isActive: { $ne: false } 
        }, null, { session });
      }

      // Crear distribuciones para cada socio
      const partnerDistributions = [];
      for (const partner of partnersList) {
        const partnerId = partner._id || partner;
        const partnerData = typeof partner === 'object' ? partner : 
                           await Partner.findById(partnerId).session(session);
        
        if (!partnerData) continue;

        const participation = partnerData.participation || '0%';
        const participationValue = parseFloat(participation.replace('%', '')) / 100;
        const amount = newDistribution.totalAmount * participationValue;

        const partnerDistribution = new PartnerDistribution({
          distributionId: newDistribution._id,
          partnerId,
          amount,
          participation: participation,
          status: 'pending',
          date: newDistribution.date
        });

        await partnerDistribution.save({ session });
        partnerDistributions.push(partnerDistribution);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({ 
        distribution: newDistribution, 
        partnerDistributions 
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Error al crear distribución:', error);
      
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.message
        });
      }
      
      res.status(500).json({ message: 'Error al crear distribución' });
    }
  }

  /**
   * Actualizar una distribución existente
   */
  static async update(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const updates = req.body;
      const { updatePartnerDistributions = false } = updates;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de distribución inválido' });
      }

      const distribution = await Distribution.findById(id).session(session);

      if (!distribution || distribution.isActive === false) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Distribución no encontrada' });
      }

      // Actualizar campos de la distribución
      const updatedDistribution = await Distribution.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true, session }
      );

      // Si se solicita, actualizar también las distribuciones por socio
      if (updatePartnerDistributions && updatedDistribution) {
        const partnerDistributions = await PartnerDistribution.find({
          distributionId: id,
          isActive: { $ne: false }
        }).session(session);

        for (const pd of partnerDistributions) {
          const participation = parseFloat(pd.participation.replace('%', '')) / 100;
          const newAmount = updatedDistribution.totalAmount * participation;

          await PartnerDistribution.findByIdAndUpdate(
            pd._id,
            { 
              amount: newAmount,
              date: updatedDistribution.date 
            },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json(updatedDistribution);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(`Error al actualizar distribución:`, error);
      
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.message
        });
      }
      
      res.status(500).json({ message: 'Error al actualizar distribución' });
    }
  }

  /**
   * Completar una distribución (marcar como completada)
   */
  static async complete(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de distribución inválido' });
      }

      const distribution = await Distribution.findById(id).session(session);

      if (!distribution || distribution.isActive === false) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Distribución no encontrada' });
      }

      // Marcar la distribución como completada
      await Distribution.findByIdAndUpdate(
        id, 
        { status: 'completed' },
        { session }
      );

      // Marcar todas las distribuciones por socio como pagadas
      await PartnerDistribution.updateMany(
        { distributionId: id, isActive: { $ne: false } },
        { status: 'paid' },
        { session }
      );

      // Actualizar dividendos acumulados de cada socio
      const partnerDistributions = await PartnerDistribution.find({
        distributionId: id,
        isActive: { $ne: false }
      }).session(session);

      for (const pd of partnerDistributions) {
        const partner = await Partner.findById(pd.partnerId).session(session);
        if (partner) {
          const dividendsYTD = (partner.dividendsYTD || 0) + pd.amount;
          await Partner.findByIdAndUpdate(
            pd.partnerId,
            { dividendsYTD },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Distribución completada correctamente' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(`Error al completar distribución:`, error);
      res.status(500).json({ message: 'Error al completar distribución' });
    }
  }

  /**
   * Eliminar una distribución (marcar como inactiva)
   */
  static async delete(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de distribución inválido' });
      }

      const distribution = await Distribution.findById(id).session(session);

      if (!distribution || distribution.isActive === false) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Distribución no encontrada' });
      }

      // Marcar la distribución como inactiva
      await Distribution.findByIdAndUpdate(id, { isActive: false }, { session });

      // Marcar las distribuciones por socio como inactivas
      await PartnerDistribution.updateMany(
        { distributionId: id },
        { isActive: false },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Distribución eliminada correctamente' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(`Error al eliminar distribución:`, error);
      res.status(500).json({ message: 'Error al eliminar distribución' });
    }
  }

  /**
   * Obtener resumen de dividendos
   */
  static async getDividendsSummary(req: Request, res: Response) {
    try {
      // Contar socios activos
      const activePartnersCount = await Partner.countDocuments({
        status: 'active',
        isActive: { $ne: false }
      });

      // Obtener capital total invertido por los socios
      const partners = await Partner.find({
        isActive: { $ne: false }
      });
      
      const totalCapital = partners.reduce((sum, partner) => sum + (partner.totalInvested || 0), 0);

      // Obtener año actual
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      
      // Obtener distribuciones del año en curso
      const completedDistributions = await Distribution.find({
        status: 'completed',
        date: { $gte: startOfYear },
        isActive: { $ne: false }
      });
      
      // Calcular totales
      const totalDistributionsYTD = completedDistributions.reduce(
        (sum, dist) => sum + (dist.totalAmount || 0), 0
      );
      
      const totalReinvestmentYTD = completedDistributions.reduce(
        (sum, dist) => sum + (dist.reinvestment || 0), 0
      );
      
      // Obtener próxima distribución
      const nextDistribution = await Distribution.findOne({
        status: 'pending',
        isActive: { $ne: false }
      }).sort({ date: 1 });
      
      res.status(200).json({
        activePartners: activePartnersCount,
        totalCapital,
        totalDistributionsYTD,
        distributionsCount: completedDistributions.length,
        nextDistribution,
        totalReinvestmentYTD
      });
    } catch (error) {
      console.error('Error al obtener resumen de dividendos:', error);
      res.status(500).json({ message: 'Error al obtener resumen de dividendos' });
    }
  }
} 