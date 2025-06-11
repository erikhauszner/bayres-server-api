/**
 * Middleware de Auditoría
 * 
 * Este middleware se puede aplicar a rutas específicas para registrar automáticamente
 * las acciones realizadas en esas rutas.
 */

import { Request, Response, NextFunction } from 'express';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';

interface AuditMiddlewareOptions {
  targetType: string;
  action: string;
  module?: string;
  getTargetId?: (req: Request) => string;
  getDescription?: (req: Request) => string;
  getPreviousData?: (req: Request) => any;
  getNewData?: (req: Request) => any;
  skipAudit?: (req: Request) => boolean;
}

/**
 * Middleware para auditar operaciones basadas en las opciones proporcionadas
 */
export const auditAction = (options: AuditMiddlewareOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Guardar el método original de res.json para interceptar la respuesta
    const originalJson = res.json;
    
    // Si existe una función para determinar si se debe omitir la auditoría, ejecutarla
    if (options.skipAudit && options.skipAudit(req)) {
      return next();
    }
    
    try {
      // Obtener datos previos si es necesario
      const previousData = options.getPreviousData ? 
        await options.getPreviousData(req) : 
        undefined;
      
      // Sobrescribir el método json para capturar la respuesta antes de enviarla
      res.json = function(body) {
        // Restaurar el método original
        res.json = originalJson;
        
        // Solo auditar si la respuesta es exitosa (código 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Determinar el ID del objetivo
            const targetId = options.getTargetId ? 
              options.getTargetId(req) : 
              (req.params.id || (body?.data?._id?.toString() || ''));
            
            // Obtener datos nuevos si es necesario
            const newData = options.getNewData ? 
              options.getNewData(req) : 
              (body?.data ? sanitizeDataForAudit(body.data) : undefined);
            
            // Determinar la descripción
            let description = '';
            if (options.getDescription) {
              description = options.getDescription(req);
            } else {
              const targetName = body?.data?.name || 
                body?.data?.firstName ? 
                `${body.data.firstName} ${body.data.lastName || ''}` : 
                targetId;
              
              description = `${options.action} de ${options.targetType}: ${targetName}`;
            }
            
            // Registrar la acción de auditoría
            logAuditAction(
              req,
              options.action,
              description,
              options.targetType,
              targetId,
              previousData,
              newData,
              options.module
            ).catch(error => {
              console.error('Error al registrar auditoría desde middleware:', error);
            });
          } catch (error) {
            console.error('Error en middleware de auditoría:', error);
          }
        }
        
        // Llamar al método original y devolver su resultado
        return originalJson.call(res, body);
      };
      
      // Continuar con el siguiente middleware
      next();
    } catch (error) {
      console.error('Error en middleware de auditoría:', error);
      next();
    }
  };
};

/**
 * Middleware preconfigurado para auditar creaciones
 */
export const auditCreation = (targetType: string, options: Partial<AuditMiddlewareOptions> = {}) => {
  return auditAction({
    targetType,
    action: 'creación',
    module: options.module,
    getTargetId: options.getTargetId,
    getDescription: options.getDescription,
    getNewData: options.getNewData,
    skipAudit: options.skipAudit
  });
};

/**
 * Middleware preconfigurado para auditar actualizaciones
 */
export const auditUpdate = (targetType: string, options: Partial<AuditMiddlewareOptions> = {}) => {
  return auditAction({
    targetType,
    action: 'actualización',
    module: options.module,
    getTargetId: options.getTargetId || ((req) => req.params.id),
    getDescription: options.getDescription,
    getPreviousData: options.getPreviousData,
    getNewData: options.getNewData,
    skipAudit: options.skipAudit
  });
};

/**
 * Middleware preconfigurado para auditar eliminaciones
 */
export const auditDeletion = (targetType: string, options: Partial<AuditMiddlewareOptions> = {}) => {
  return auditAction({
    targetType,
    action: 'eliminación',
    module: options.module,
    getTargetId: options.getTargetId || ((req) => req.params.id),
    getDescription: options.getDescription,
    getPreviousData: options.getPreviousData,
    skipAudit: options.skipAudit
  });
}; 