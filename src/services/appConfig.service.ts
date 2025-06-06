import AppConfig, { IAppConfig } from '../models/AppConfig';
import { Types } from 'mongoose';

// Interfaz para la creación/actualización de configuraciones
interface AppConfigData {
  appName: string;
  appKey: string;
  employeeId?: string;
  config: Record<string, any>;
}

export class AppConfigService {
  /**
   * Obtener configuración por nombre de app y key
   */
  static async getByAppNameAndKey(appName: string, appKey: string): Promise<IAppConfig | null> {
    return AppConfig.findOne({ appName, appKey, isActive: true });
  }

  /**
   * Obtener configuración por ID
   */
  static async getById(id: string): Promise<IAppConfig | null> {
    return AppConfig.findById(id);
  }

  /**
   * Obtener todas las configuraciones para una app
   */
  static async getByAppName(appName: string): Promise<IAppConfig[]> {
    return AppConfig.find({ appName, isActive: true });
  }

  /**
   * Obtener configuraciones de un empleado específico
   */
  static async getByEmployee(employeeId: string, appName?: string): Promise<IAppConfig[]> {
    const query: any = { employeeId, isActive: true };
    
    if (appName) {
      query.appName = appName;
    }
    
    return AppConfig.find(query);
  }

  /**
   * Crear una nueva configuración
   */
  static async create(data: AppConfigData): Promise<IAppConfig> {
    const appConfig = new AppConfig({
      appName: data.appName,
      appKey: data.appKey,
      employeeId: data.employeeId ? new Types.ObjectId(data.employeeId) : undefined,
      config: data.config,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await appConfig.save();
    return appConfig;
  }

  /**
   * Actualizar una configuración existente
   */
  static async update(id: string, data: Partial<AppConfigData>): Promise<IAppConfig | null> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    // Si se proporciona employeeId, convertirlo a ObjectId
    if (data.employeeId) {
      updateData.employeeId = new Types.ObjectId(data.employeeId);
    }
    
    return AppConfig.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
  }

  /**
   * Actualizar o crear configuración por nombre de app y key
   */
  static async upsertByAppNameAndKey(
    appName: string, 
    appKey: string, 
    config: Record<string, any>,
    employeeId?: string
  ): Promise<IAppConfig> {
    const existingConfig = await AppConfig.findOne({ appName, appKey });
    
    if (existingConfig) {
      existingConfig.config = config;
      existingConfig.updatedAt = new Date();
      
      if (employeeId && !existingConfig.employeeId) {
        existingConfig.employeeId = new Types.ObjectId(employeeId);
      }
      
      await existingConfig.save();
      return existingConfig;
    } else {
      return this.create({
        appName,
        appKey,
        employeeId,
        config
      });
    }
  }

  /**
   * Desactivar una configuración
   */
  static async deactivate(id: string): Promise<IAppConfig | null> {
    return AppConfig.findByIdAndUpdate(
      id,
      { $set: { isActive: false, updatedAt: new Date() } },
      { new: true }
    );
  }

  /**
   * Eliminar una configuración
   */
  static async delete(id: string): Promise<boolean> {
    const result = await AppConfig.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
} 