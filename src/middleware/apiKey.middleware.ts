import { Request, Response, NextFunction, RequestHandler } from 'express';
import ApiKey from '../models/ApiKey';

export const authenticateApiKey: RequestHandler = async (req, res, next) => {
  try {
    // Buscar la API key en los headers
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ message: 'API key no proporcionada' });
      return;
    }

    // Buscar la API key en la base de datos
    const keyRecord = await ApiKey.findOne({ key: apiKey });

    if (!keyRecord) {
      res.status(401).json({ message: 'API key inválida' });
      return;
    }

    // Verificar si la API key está activa
    if (keyRecord.status !== 'active') {
      res.status(403).json({ message: 'API key inactiva' });
      return;
    }

    // Verificar si la API key ha expirado
    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      // Marcar la API key como inactiva si ha expirado
      keyRecord.status = 'inactive';
      await keyRecord.save();
      
      res.status(403).json({ message: 'API key expirada' });
      return;
    }

    // Actualizar la fecha de último uso
    keyRecord.lastUsed = new Date();
    await keyRecord.save();

    // Almacenar los permisos de la API key en la solicitud para uso posterior
    (req as any).apiKeyPermissions = keyRecord.permissions;
    (req as any).apiKeyId = keyRecord._id;

    next();
  } catch (error) {
    console.error('Error al validar API key:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Middleware para verificar permisos específicos de API key
export const checkApiKeyPermissions = (requiredPermissions: string[]): RequestHandler => {
  return (req, res, next) => {
    const apiKeyPermissions = (req as any).apiKeyPermissions || [];
    
    // Verificar si la API key tiene todos los permisos requeridos
    const hasPermission = requiredPermissions.every(permission => 
      apiKeyPermissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({ 
        message: 'La API key no tiene los permisos necesarios', 
        requiredPermissions 
      });
      return;
    }

    next();
  };
}; 