import { Request, Response } from 'express';
import LeadOriginCategory from '../models/LeadOriginCategory';
import LeadStageCategory from '../models/LeadStageCategory';

export const leadCategoryController = {
  // Origen de leads
  getAllOrigins: async (req: Request, res: Response) => {
    try {
      const origins = await LeadOriginCategory.find({ active: true }).sort({ name: 1 });
      return res.status(200).json(origins);
    } catch (error) {
      console.error('Error al obtener orígenes de leads:', error);
      return res.status(500).json({ message: 'Error al obtener orígenes de leads' });
    }
  },

  getOriginById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const origin = await LeadOriginCategory.findById(id);
      
      if (!origin) {
        return res.status(404).json({ message: 'Origen de lead no encontrado' });
      }
      
      return res.status(200).json(origin);
    } catch (error) {
      console.error('Error al obtener origen de lead:', error);
      return res.status(500).json({ message: 'Error al obtener origen de lead' });
    }
  },

  createOrigin: async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
      }
      
      const newOrigin = await LeadOriginCategory.create({
        name,
        description: description || ''
      });
      
      return res.status(201).json(newOrigin);
    } catch (error) {
      console.error('Error al crear origen de lead:', error);
      return res.status(500).json({ message: 'Error al crear origen de lead' });
    }
  },

  updateOrigin: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
      }
      
      const updatedOrigin = await LeadOriginCategory.findByIdAndUpdate(
        id,
        {
          name,
          description: description || ''
        },
        { new: true }
      );
      
      if (!updatedOrigin) {
        return res.status(404).json({ message: 'Origen de lead no encontrado' });
      }
      
      return res.status(200).json(updatedOrigin);
    } catch (error) {
      console.error('Error al actualizar origen de lead:', error);
      return res.status(500).json({ message: 'Error al actualizar origen de lead' });
    }
  },

  deleteOrigin: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const deletedOrigin = await LeadOriginCategory.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );
      
      if (!deletedOrigin) {
        return res.status(404).json({ message: 'Origen de lead no encontrado' });
      }
      
      return res.status(200).json({ message: 'Origen de lead eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar origen de lead:', error);
      return res.status(500).json({ message: 'Error al eliminar origen de lead' });
    }
  },

  // Etapas de leads
  getAllStages: async (req: Request, res: Response) => {
    try {
      const stages = await LeadStageCategory.find({ active: true }).sort({ order: 1, name: 1 });
      return res.status(200).json(stages);
    } catch (error) {
      console.error('Error al obtener etapas de leads:', error);
      return res.status(500).json({ message: 'Error al obtener etapas de leads' });
    }
  },

  getStageById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const stage = await LeadStageCategory.findById(id);
      
      if (!stage) {
        return res.status(404).json({ message: 'Etapa de lead no encontrada' });
      }
      
      return res.status(200).json(stage);
    } catch (error) {
      console.error('Error al obtener etapa de lead:', error);
      return res.status(500).json({ message: 'Error al obtener etapa de lead' });
    }
  },

  createStage: async (req: Request, res: Response) => {
    try {
      const { name, description, order } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
      }
      
      // Obtener el último orden si no se proporciona
      let stageOrder = order;
      if (stageOrder === undefined) {
        const lastStage = await LeadStageCategory.findOne({ active: true }).sort({ order: -1 });
        stageOrder = lastStage ? lastStage.order + 1 : 0;
      }
      
      const newStage = await LeadStageCategory.create({
        name,
        description: description || '',
        order: stageOrder
      });
      
      return res.status(201).json(newStage);
    } catch (error) {
      console.error('Error al crear etapa de lead:', error);
      return res.status(500).json({ message: 'Error al crear etapa de lead' });
    }
  },

  updateStage: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, order } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
      }
      
      const updateData: any = {
        name,
        description: description || ''
      };
      
      if (order !== undefined) {
        updateData.order = order;
      }
      
      const updatedStage = await LeadStageCategory.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      if (!updatedStage) {
        return res.status(404).json({ message: 'Etapa de lead no encontrada' });
      }
      
      return res.status(200).json(updatedStage);
    } catch (error) {
      console.error('Error al actualizar etapa de lead:', error);
      return res.status(500).json({ message: 'Error al actualizar etapa de lead' });
    }
  },

  deleteStage: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verificar si es una etapa del sistema
      const stage = await LeadStageCategory.findById(id);
      if (!stage) {
        return res.status(404).json({ message: 'Etapa de lead no encontrada' });
      }
      
      // No permitir eliminar etapas del sistema
      if (stage.isSystem) {
        return res.status(403).json({ 
          message: 'No se puede eliminar una etapa del sistema',
          isSystemStage: true
        });
      }
      
      const deletedStage = await LeadStageCategory.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );
      
      if (!deletedStage) {
        return res.status(404).json({ message: 'Etapa de lead no encontrada' });
      }
      
      return res.status(200).json({ message: 'Etapa de lead eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar etapa de lead:', error);
      return res.status(500).json({ message: 'Error al eliminar etapa de lead' });
    }
  }
}; 