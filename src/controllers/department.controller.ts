import { Request, Response } from 'express';
import Department from '../models/Department';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

export const departmentController = {
  getAllDepartments: async (req: Request, res: Response) => {
    try {
      const departments = await Department.find({ active: true }).sort({ name: 1 });
      return res.status(200).json(departments);
    } catch (error) {
      console.error('Error al obtener departamentos:', error);
      return res.status(500).json({ message: 'Error al obtener departamentos' });
    }
  },

  getDepartmentById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const department = await Department.findById(id);
      
      if (!department) {
        return res.status(404).json({ message: 'Departamento no encontrado' });
      }
      
      return res.status(200).json(department);
    } catch (error) {
      console.error('Error al obtener departamento:', error);
      return res.status(500).json({ message: 'Error al obtener departamento' });
    }
  },

  createDepartment: async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
      }
      
      const newDepartment = await Department.create({
        name,
        description: description || ''
      });
      
      return res.status(201).json(newDepartment);
    } catch (error) {
      console.error('Error al crear departamento:', error);
      return res.status(500).json({ message: 'Error al crear departamento' });
    }
  },

  updateDepartment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
      }
      
      const updatedDepartment = await Department.findByIdAndUpdate(
        id,
        {
          name,
          description: description || ''
        },
        { new: true }
      );
      
      if (!updatedDepartment) {
        return res.status(404).json({ message: 'Departamento no encontrado' });
      }
      
      return res.status(200).json(updatedDepartment);
    } catch (error) {
      console.error('Error al actualizar departamento:', error);
      return res.status(500).json({ message: 'Error al actualizar departamento' });
    }
  },

  deleteDepartment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const deletedDepartment = await Department.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );
      
      if (!deletedDepartment) {
        return res.status(404).json({ message: 'Departamento no encontrado' });
      }
      
      return res.status(200).json({ message: 'Departamento eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar departamento:', error);
      return res.status(500).json({ message: 'Error al eliminar departamento' });
    }
  }
}; 