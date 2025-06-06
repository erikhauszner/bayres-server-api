import { Request, Response } from 'express';
import ApiKey, { IApiKey } from '../models/ApiKey';
import crypto from 'crypto';
import mongoose from 'mongoose';

export class ApiKeyController {
  /**
   * Obtiene todas las API keys
   */
  static async getAllApiKeys(req: Request, res: Response) {
    try {
      const apiKeys = await ApiKey.find()
        .select('-key') // No enviar la clave completa por seguridad
        .sort({ createdAt: -1 });
      
      // Formateamos la respuesta para enviar solo la información necesaria
      const formattedApiKeys = apiKeys.map(key => {
        // Validamos que key.key exista antes de usar substring
        let maskedKey = 'No disponible';
        if (key.key && typeof key.key === 'string') {
          maskedKey = `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}`;
        }
        
        return {
          id: key._id,
          name: key.name,
          status: key.status,
          permissions: key.permissions,
          expiresAt: key.expiresAt,
          lastUsed: key.lastUsed,
          createdAt: key.createdAt,
          maskedKey
        };
      });

      res.status(200).json(formattedApiKeys);
    } catch (error) {
      console.error('Error al obtener API keys:', error);
      res.status(500).json({ message: 'Error al obtener las API keys', error });
    }
  }

  /**
   * Crea una nueva API key
   */
  static async createApiKey(req: Request, res: Response) {
    try {
      const { name, permissions, expiresIn } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'El nombre es requerido' });
      }

      // Generar una API key aleatoria segura
      const apiKeyValue = crypto.randomBytes(32).toString('hex');
      const prefix = 'brs_';
      const fullKey = `${prefix}${apiKeyValue}`;

      // Calcular fecha de expiración si se proporciona
      let expiresAt = undefined;
      if (expiresIn) {
        expiresAt = new Date();
        if (expiresIn === '30days') {
          expiresAt.setDate(expiresAt.getDate() + 30);
        } else if (expiresIn === '90days') {
          expiresAt.setDate(expiresAt.getDate() + 90);
        } else if (expiresIn === '1year') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }
      }

      // Determinar los permisos basados en el input
      let apiPermissions: string[] = ['read'];
      if (permissions === 'full') {
        apiPermissions = ['read', 'write', 'delete'];
      } else if (permissions === 'readwrite') {
        apiPermissions = ['read', 'write'];
      }

      // Crear la API key en la base de datos
      const apiKey = new ApiKey({
        name,
        key: fullKey,
        permissions: apiPermissions,
        expiresAt,
        createdBy: req.employee?._id
      });

      await apiKey.save();

      // Retornar la clave completa solo una vez después de crearla
      res.status(201).json({
        id: apiKey._id,
        name: apiKey.name,
        key: fullKey, // Clave completa (solo se muestra una vez)
        permissions: apiKey.permissions,
        status: apiKey.status,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      });

    } catch (error) {
      console.error('Error al crear API key:', error);
      res.status(500).json({ message: 'Error al crear la API key', error });
    }
  }

  /**
   * Obtiene una API key específica por ID
   */
  static async getApiKeyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de API key inválido' });
      }

      const apiKey = await ApiKey.findById(id);

      if (!apiKey) {
        return res.status(404).json({ message: 'API key no encontrada' });
      }

      // Enmascarar la clave por seguridad
      let maskedKey = 'No disponible';
      if (apiKey.key && typeof apiKey.key === 'string') {
        maskedKey = `${apiKey.key.substring(0, 8)}...${apiKey.key.substring(apiKey.key.length - 4)}`;
      }

      res.status(200).json({
        id: apiKey._id,
        name: apiKey.name,
        maskedKey,
        permissions: apiKey.permissions,
        status: apiKey.status,
        expiresAt: apiKey.expiresAt,
        lastUsed: apiKey.lastUsed,
        createdAt: apiKey.createdAt
      });
    } catch (error) {
      console.error('Error al obtener API key:', error);
      res.status(500).json({ message: 'Error al obtener la API key', error });
    }
  }

  /**
   * Actualiza el estado de una API key (activar/desactivar)
   */
  static async updateApiKeyStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de API key inválido' });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Estado inválido' });
      }

      const apiKey = await ApiKey.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!apiKey) {
        return res.status(404).json({ message: 'API key no encontrada' });
      }

      res.status(200).json({
        id: apiKey._id,
        name: apiKey.name,
        status: apiKey.status,
        updatedAt: apiKey.updatedAt
      });
    } catch (error) {
      console.error('Error al actualizar estado de API key:', error);
      res.status(500).json({ message: 'Error al actualizar el estado de la API key', error });
    }
  }

  /**
   * Elimina una API key
   */
  static async deleteApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de API key inválido' });
      }

      const apiKey = await ApiKey.findByIdAndDelete(id);

      if (!apiKey) {
        return res.status(404).json({ message: 'API key no encontrada' });
      }

      res.status(200).json({ message: 'API key eliminada correctamente', id });
    } catch (error) {
      console.error('Error al eliminar API key:', error);
      res.status(500).json({ message: 'Error al eliminar la API key', error });
    }
  }
} 