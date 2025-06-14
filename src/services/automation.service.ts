import Automation, { IAutomation, IAutomationField, IAutomationConfig } from '../models/Automation';
import { Types } from 'mongoose';

// Interfaz para la creación de automatizaciones
interface CreateAutomationData {
  name: string;
  description?: string;
  fields: IAutomationField[];
  config: IAutomationConfig;
  createdBy: string;
}

// Interfaz para la actualización de automatizaciones
interface UpdateAutomationData {
  name?: string;
  description?: string;
  fields?: IAutomationField[];
  config?: IAutomationConfig;
  status?: 'active' | 'inactive' | 'draft';
}

export class AutomationService {
  /**
   * Crear una nueva automatización
   */
  static async create(data: CreateAutomationData): Promise<IAutomation> {
    const automation = new Automation({
      name: data.name,
      description: data.description,
      fields: data.fields,
      config: data.config,
      createdBy: new Types.ObjectId(data.createdBy),
      status: 'draft'
    });

    await automation.save();
    return automation;
  }

  /**
   * Obtener todas las automatizaciones
   */
  static async getAll(filters?: {
    status?: string;
    createdBy?: string;
    search?: string;
  }): Promise<IAutomation[]> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.createdBy) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return Automation.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  /**
   * Obtener automatización por ID
   */
  static async getById(id: string): Promise<IAutomation | null> {
    return Automation.findById(id)
      .populate('createdBy', 'firstName lastName email');
  }

  /**
   * Obtener automatización por nombre
   */
  static async getByName(name: string): Promise<IAutomation | null> {
    return Automation.findOne({ name })
      .populate('createdBy', 'firstName lastName email');
  }

  /**
   * Actualizar automatización
   */
  static async update(id: string, data: UpdateAutomationData): Promise<IAutomation | null> {
    return Automation.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).populate('createdBy', 'firstName lastName email');
  }

  /**
   * Eliminar automatización
   */
  static async delete(id: string): Promise<boolean> {
    const result = await Automation.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Cambiar estado de automatización
   */
  static async changeStatus(id: string, status: 'active' | 'inactive' | 'draft'): Promise<IAutomation | null> {
    return Automation.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('createdBy', 'firstName lastName email');
  }

  /**
   * Obtener automatizaciones activas
   */
  static async getActive(): Promise<IAutomation[]> {
    return Automation.find({ status: 'active' })
      .populate('createdBy', 'firstName lastName email')
      .sort({ name: 1 });
  }

  /**
   * Duplicar automatización
   */
  static async duplicate(id: string, newName: string, createdBy: string): Promise<IAutomation> {
    const original = await Automation.findById(id);
    if (!original) {
      throw new Error('Automatización no encontrada');
    }

    const duplicated = new Automation({
      name: newName,
      description: original.description ? `${original.description} (Copia)` : undefined,
      fields: original.fields,
      config: original.config,
      createdBy: new Types.ObjectId(createdBy),
      status: 'draft'
    });

    await duplicated.save();
    return duplicated;
  }

  /**
   * Validar configuración de automatización
   */
  static validateAutomation(data: CreateAutomationData | UpdateAutomationData): string[] {
    const errors: string[] = [];

    // Validar nombre
    if ('name' in data && (!data.name || data.name.trim().length === 0)) {
      errors.push('El nombre es obligatorio');
    }

    // Validar campos
    if ('fields' in data && data.fields) {
      if (data.fields.length === 0) {
        errors.push('Debe tener al menos un campo');
      }

      // Validar cada campo
      data.fields.forEach((field, index) => {
        if (!field.name || field.name.trim().length === 0) {
          errors.push(`Campo ${index + 1}: El nombre del campo es obligatorio`);
        }
        if (!field.label || field.label.trim().length === 0) {
          errors.push(`Campo ${index + 1}: La etiqueta del campo es obligatoria`);
        }
        if (!['small', 'medium', 'large'].includes(field.size)) {
          errors.push(`Campo ${index + 1}: El tamaño debe ser small, medium o large`);
        }
      });

      // Validar nombres únicos
      const fieldNames = data.fields.map(f => f.name);
      const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        errors.push(`Nombres de campos duplicados: ${duplicateNames.join(', ')}`);
      }
    }

    // Validar configuración
    if ('config' in data && data.config) {
      if (!data.config.webhookUrl || data.config.webhookUrl.trim().length === 0) {
        errors.push('La URL del webhook es obligatoria');
      }

      // Validar formato de URL
      if (data.config.webhookUrl) {
        try {
          new URL(data.config.webhookUrl);
        } catch {
          errors.push('La URL del webhook no tiene un formato válido');
        }
      }

      // Validar URLs de redirección si están presentes
      if (data.config.successRedirectUrl) {
        try {
          new URL(data.config.successRedirectUrl);
        } catch {
          errors.push('La URL de redirección de éxito no tiene un formato válido');
        }
      }

      if (data.config.errorRedirectUrl) {
        try {
          new URL(data.config.errorRedirectUrl);
        } catch {
          errors.push('La URL de redirección de error no tiene un formato válido');
        }
      }
    }

    return errors;
  }

  /**
   * Obtener estadísticas de automatizaciones
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    draft: number;
  }> {
    const [total, active, inactive, draft] = await Promise.all([
      Automation.countDocuments(),
      Automation.countDocuments({ status: 'active' }),
      Automation.countDocuments({ status: 'inactive' }),
      Automation.countDocuments({ status: 'draft' })
    ]);

    return { total, active, inactive, draft };
  }
} 