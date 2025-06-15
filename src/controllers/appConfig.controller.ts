import { Request, Response } from 'express';
import { AppConfigService } from '../services/appConfig.service';
import { IEmployee } from '../models/Employee';
import { validateObjectId } from '../utils/validators';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

// Definir tipos para usar en el controlador
interface RequestWithUser extends Request {
  user?: IEmployee;
  employee?: IEmployee;
}

export class AppConfigController {
  /**
   * Obtener configuración de una app por su nombre y clave
   */
  static async getAppConfig(req: Request, res: Response) {
    try {
      const { appName, appKey } = req.params;
      
      if (!appName || !appKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requieren los parámetros appName y appKey' 
        });
      }
      
      const appConfig = await AppConfigService.getByAppNameAndKey(appName, appKey);
      
      if (!appConfig) {
        return res.status(404).json({ 
          success: false, 
          message: 'Configuración no encontrada' 
        });
      }
      
      res.json({
        success: true,
        data: appConfig.config
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  /**
   * Obtener todas las configuraciones para una app
   */
  static async getAllAppConfigs(req: Request, res: Response) {
    try {
      const { appName } = req.params;
      
      if (!appName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el parámetro appName' 
        });
      }
      
      const appConfigs = await AppConfigService.getByAppName(appName);
      
      const configsData = appConfigs.map(config => ({
        id: config._id,
        appKey: config.appKey,
        config: config.config,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));
      
      res.json({
        success: true,
        data: configsData
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  /**
   * Crear o actualizar configuración de app
   */
  static async upsertAppConfig(req: RequestWithUser, res: Response) {
    try {
      const { appName, appKey } = req.params;
      const config = req.body;
      
      if (!appName || !appKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requieren los parámetros appName y appKey' 
        });
      }
      
      if (!config || typeof config !== 'object') {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere un objeto de configuración válido' 
        });
      }
      
      // Obtener el ID del empleado si está autenticado
      const employeeId = req.employee?._id?.toString() || req.user?._id?.toString();
      
      const appConfig = await AppConfigService.upsertByAppNameAndKey(
        appName,
        appKey,
        config,
        employeeId
      );
      
      res.json({
        success: true,
        message: 'Configuración guardada correctamente',
        data: {
          id: appConfig._id,
          appName: appConfig.appName,
          appKey: appConfig.appKey,
          config: appConfig.config,
          updatedAt: appConfig.updatedAt
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  /**
   * Eliminar configuración de app
   */
  static async deleteAppConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id || !validateObjectId(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere un ID válido' 
        });
      }
      
      const deleted = await AppConfigService.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: 'Configuración no encontrada' 
        });
      }
      
      res.json({
        success: true,
        message: 'Configuración eliminada correctamente'
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
} 