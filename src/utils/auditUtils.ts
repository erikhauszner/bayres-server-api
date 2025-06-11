/**
 * Utilidades para la auditoría
 * Este archivo contiene funciones auxiliares para simplificar la implementación
 * de la auditoría en los diferentes modelos y controladores del sistema.
 */

import { Request } from 'express';
import { Document } from 'mongoose';
import auditService from '../services/auditService';
import { IEmployee } from '../models/Employee';

// Extender la interfaz Request para incluir employee
declare global {
  namespace Express {
    interface Request {
      employee?: IEmployee;
    }
  }
}

/**
 * Genera los datos necesarios para registrar una acción de auditoría a partir del contexto actual
 */
export const createAuditLogData = (
  req: Request,
  action: string, 
  description: string, 
  targetType: string,
  targetId: string,
  previousData?: any,
  newData?: any,
  module?: string
) => {
  // Obtener información del usuario desde el request
  const employee = req.employee as IEmployee;
  
  if (!employee || !employee._id) {
    throw new Error('No se pudo obtener la información del usuario para la auditoría');
  }
  
  return {
    userId: employee._id.toString(),
    userName: `${employee.firstName} ${employee.lastName}`,
    action,
    description,
    targetType,
    targetId: targetId.toString(),
    previousData,
    newData,
    module: module || getModuleFromTargetType(targetType)
  };
};

/**
 * Registra una acción de auditoría usando el servicio de auditoría
 */
export const logAuditAction = async (
  req: Request,
  action: string, 
  description: string, 
  targetType: string,
  targetId: string,
  previousData?: any,
  newData?: any,
  module?: string
) => {
  try {
    const auditData = createAuditLogData(
      req, 
      action, 
      description, 
      targetType, 
      targetId, 
      previousData, 
      newData, 
      module
    );
    
    return await auditService.logAction(req, auditData);
  } catch (error) {
    console.error('Error al registrar acción de auditoría:', error);
    // No lanzamos el error para evitar interrumpir la operación principal
  }
};

/**
 * Determina el módulo basado en el tipo de entidad objetivo
 */
export const getModuleFromTargetType = (targetType: string): string => {
  const moduleMap: Record<string, string> = {
    'lead': 'leads',
    'cliente': 'clientes',
    'empleado': 'empleados',
    'proyecto': 'proyectos',
    'tarea': 'tareas',
    'finanzas': 'finanzas',
    'campaña': 'marketing',
    'rol': 'configuracion',
    'permiso': 'configuracion'
  };
  
  return moduleMap[targetType] || 'otro';
};

/**
 * Genera una descripción estándar para acciones de creación
 */
export const getCreationDescription = (targetType: string, targetName: string): string => {
  return `Creación de ${targetType}: ${targetName}`;
};

/**
 * Genera una descripción estándar para acciones de actualización
 */
export const getUpdateDescription = (targetType: string, targetName: string, changedFields?: string[]): string => {
  if (changedFields && changedFields.length > 0) {
    return `Actualización de ${targetType}: ${targetName} (campos: ${changedFields.join(', ')})`;
  }
  return `Actualización de ${targetType}: ${targetName}`;
};

/**
 * Genera una descripción estándar para acciones de eliminación
 */
export const getDeletionDescription = (targetType: string, targetName: string): string => {
  return `Eliminación de ${targetType}: ${targetName}`;
};

/**
 * Obtiene los campos modificados entre dos objetos
 */
export const getChangedFields = (oldDoc: any, newDoc: any): string[] => {
  if (!oldDoc || !newDoc) return [];
  
  // Convertir documentos de Mongoose a objetos planos si es necesario
  const oldObj = oldDoc.toObject ? oldDoc.toObject() : oldDoc;
  const newObj = newDoc.toObject ? newDoc.toObject() : newDoc;
  
  // Obtener todos los campos únicos de ambos objetos
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  
  // Campos a ignorar en la comparación
  const ignoredFields = ['_id', '__v', 'createdAt', 'updatedAt'];
  
  // Encontrar campos que han cambiado
  const changedFields: string[] = [];
  
  allKeys.forEach(key => {
    if (ignoredFields.includes(key)) return;
    
    // Si el campo existe en ambos objetos y los valores son diferentes
    if (oldObj[key] !== undefined && newObj[key] !== undefined) {
      // Comparación especial para fechas
      if (oldObj[key] instanceof Date && newObj[key] instanceof Date) {
        if (oldObj[key].getTime() !== newObj[key].getTime()) {
          changedFields.push(key);
        }
      }
      // Comparación especial para objetos y arrays
      else if (
        typeof oldObj[key] === 'object' && 
        typeof newObj[key] === 'object' && 
        JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])
      ) {
        changedFields.push(key);
      }
      // Comparación simple para tipos primitivos
      else if (oldObj[key] !== newObj[key]) {
        changedFields.push(key);
      }
    }
    // Si el campo existe en uno pero no en el otro
    else if (oldObj[key] !== undefined || newObj[key] !== undefined) {
      changedFields.push(key);
    }
  });
  
  return changedFields;
};

/**
 * Crea una versión limpia de datos para el registro de auditoría
 * eliminando campos sensibles y datos innecesarios
 */
export const sanitizeDataForAudit = (data: any): any => {
  if (!data) return null;
  
  // Convertir documentos de Mongoose a objetos planos si es necesario
  const obj = data.toObject ? data.toObject() : { ...data };
  
  // Campos sensibles a eliminar
  const sensitiveFields = ['password', 'salt', 'passwordResetToken', 'passwordResetExpires'];
  
  // Eliminar campos sensibles
  sensitiveFields.forEach(field => {
    if (obj[field] !== undefined) {
      delete obj[field];
    }
  });
  
  return obj;
}; 