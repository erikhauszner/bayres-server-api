import { Request, Response } from 'express';
import { AutomationService } from '../services/automation.service';
import { logAuditAction, sanitizeDataForAudit } from '../utils/auditUtils';
import axios from 'axios';

// Interfaz para requests con usuario autenticado
interface RequestWithUser extends Request {
  employee?: any;
  user?: any;
}

export class AutomationController {
  /**
   * Crear nueva automatización
   */
  static async create(req: RequestWithUser, res: Response) {
    try {
      const { name, description, fields, config } = req.body;
      
      if (!name || !fields || !config) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, campos y configuración son obligatorios'
        });
      }

      // Obtener el ID del empleado
      const createdBy = req.employee?._id?.toString() || req.user?._id?.toString();
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Validar datos
      const validationErrors = AutomationService.validateAutomation({
        name,
        description,
        fields,
        config,
        createdBy
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: validationErrors
        });
      }

      const automation = await AutomationService.create({
        name,
        description,
        fields,
        config,
        createdBy
      });

      // Registrar auditoría
      await logAuditAction(
        req,
        'crear_automatizacion',
        `Automatización creada: ${automation.name}`,
        'automatizacion',
        (automation._id as any).toString(),
        undefined,
        sanitizeDataForAudit(automation),
        'automatizaciones'
      );

      res.status(201).json({
        success: true,
        message: 'Automatización creada exitosamente',
        data: automation
      });
    } catch (error: any) {
      console.error('Error al crear automatización:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una automatización con ese nombre'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener todas las automatizaciones
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, search, createdBy } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (search) filters.search = search as string;
      if (createdBy) filters.createdBy = createdBy as string;

      const automations = await AutomationService.getAll(filters);

      res.json({
        success: true,
        data: automations,
        total: automations.length
      });
    } catch (error: any) {
      console.error('Error al obtener automatizaciones:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener automatización por ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const automation = await AutomationService.getById(id);
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automatización no encontrada'
        });
      }

      res.json({
        success: true,
        data: automation
      });
    } catch (error: any) {
      console.error('Error al obtener automatización:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener automatización por nombre (para uso público)
   */
  static async getByName(req: Request, res: Response) {
    try {
      const { name } = req.params;

      const automation = await AutomationService.getByName(name);
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automatización no encontrada'
        });
      }

      // Solo devolver información necesaria para el formulario público
      res.json({
        success: true,
        data: {
          name: automation.name,
          description: automation.description,
          fields: automation.fields,
          config: {
            webhookUrl: automation.config.webhookUrl,
            sendEmployeeId: automation.config.sendEmployeeId,
            successRedirectUrl: automation.config.successRedirectUrl,
            errorRedirectUrl: automation.config.errorRedirectUrl
            // No incluir apiKey por seguridad
          }
        }
      });
    } catch (error: any) {
      console.error('Error al obtener automatización por nombre:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar automatización
   */
  static async update(req: RequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validar datos si se proporcionan
      if (Object.keys(updateData).length > 0) {
        const validationErrors = AutomationService.validateAutomation(updateData);
        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: validationErrors
          });
        }
      }

      const automation = await AutomationService.update(id, updateData);
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automatización no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Automatización actualizada exitosamente',
        data: automation
      });
    } catch (error: any) {
      console.error('Error al actualizar automatización:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una automatización con ese nombre'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar automatización
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await AutomationService.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Automatización no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Automatización eliminada exitosamente'
      });
    } catch (error: any) {
      console.error('Error al eliminar automatización:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado de automatización
   */
  static async changeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'draft'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: active, inactive o draft'
        });
      }

      const automation = await AutomationService.changeStatus(id, status);
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automatización no encontrada'
        });
      }

      res.json({
        success: true,
        message: `Automatización ${status === 'active' ? 'activada' : status === 'inactive' ? 'desactivada' : 'marcada como borrador'} exitosamente`,
        data: automation
      });
    } catch (error: any) {
      console.error('Error al cambiar estado de automatización:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Duplicar automatización
   */
  static async duplicate(req: RequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { newName } = req.body;

      if (!newName) {
        return res.status(400).json({
          success: false,
          message: 'El nuevo nombre es obligatorio'
        });
      }

      const createdBy = req.employee?._id?.toString() || req.user?._id?.toString();
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const duplicated = await AutomationService.duplicate(id, newName, createdBy);

      res.status(201).json({
        success: true,
        message: 'Automatización duplicada exitosamente',
        data: duplicated
      });
    } catch (error: any) {
      console.error('Error al duplicar automatización:', error);
      
      if (error.message === 'Automatización no encontrada') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una automatización con ese nombre'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener automatizaciones activas
   */
  static async getActive(req: Request, res: Response) {
    try {
      const automations = await AutomationService.getActive();

      res.json({
        success: true,
        data: automations,
        total: automations.length
      });
    } catch (error: any) {
      console.error('Error al obtener automatizaciones activas:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de automatizaciones
   */
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await AutomationService.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener automatización pública por ID
   */
  static async getPublic(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const automation = await AutomationService.getById(id);
      
      if (!automation || automation.status !== 'active') {
        return res.status(404).json({
          success: false,
          message: 'Automatización no disponible'
        });
      }

      // Solo devolver campos públicos
      const publicData = {
        _id: automation._id,
        name: automation.name,
        description: automation.description,
        fields: automation.fields,
        isActive: automation.status === 'active'
      };

      res.json({
        success: true,
        data: publicData
      });
    } catch (error: any) {
      console.error('Error al obtener automatización pública:', error);
      res.status(404).json({
        success: false,
        message: 'Automatización no encontrada'
      });
    }
  }

  /**
   * Enviar formulario de automatización
   */
  static async submit(req: Request, res: Response) {
    try {
      console.log('🔄 AutomationController.submit - Inicio');
      console.log('📝 ID de automatización:', req.params.id);
      console.log('📄 Datos del formulario:', req.body);
      console.log('🔐 Headers de autorización:', req.headers.authorization);
      
      const { id } = req.params;
      const formData = req.body;

      const automation = await AutomationService.getById(id);
      console.log('🤖 Automatización encontrada:', !!automation);
      console.log('📊 Estado de automatización:', automation?.status);
      
      if (!automation || automation.status !== 'active') {
        console.log('❌ Automatización no disponible');
        return res.status(400).json({
          success: false,
          message: 'Automatización no disponible'
        });
      }

      // Validar campos requeridos
      if (automation.fields) {
        const requiredFields = automation.fields.filter(field => field.required);
        const missingFields = requiredFields.filter(field => !formData[field.name]);
        
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Campos requeridos faltantes: ${missingFields.map(f => f.label).join(', ')}`
          });
        }
      }

      // Procesar webhook si está configurado
      if (automation.config?.webhookUrl) {
        console.log('🔗 Enviando webhook a:', automation.config.webhookUrl);
        try {
          
          let payload = { ...formData };
          
          // Agregar datos adicionales
          payload.timestamp = new Date().toISOString();
          payload.automation_id = automation._id;
          payload.automation_name = automation.name;

          // Agregar employee ID si está configurado
          if (automation.config.sendEmployeeId) {
            // Obtener el employee ID del empleado autenticado
            const employeeId = req.employee?._id || req.user?._id;
            
            if (employeeId) {
              // Usar el employee ID del empleado autenticado
              payload.employee_id = employeeId.toString();
              console.log('✅ Employee ID del empleado autenticado:', payload.employee_id);
            } else if (formData.employee_id) {
              // Fallback: usar employee_id del payload si se proporciona
              payload.employee_id = formData.employee_id;
              console.log('✅ Employee ID del payload:', payload.employee_id);
            } else {
              // Fallback final: usar el creador de la automatización
              payload.employee_id = automation.createdBy.toString();
              console.log('✅ Employee ID del creador de automatización:', payload.employee_id);
            }
          }

          const headers: any = {
            'Content-Type': 'application/json'
          };

          if (automation.config.apiKey) {
            headers['Authorization'] = `Bearer ${automation.config.apiKey}`;
          }

          console.log('📤 Payload del webhook:', JSON.stringify(payload, null, 2));
          console.log('🔧 Headers del webhook:', headers);

          const response = await axios.post(automation.config.webhookUrl, payload, { 
            headers,
            timeout: 10000 // 10 segundos timeout
          });
          
          console.log('✅ Webhook enviado exitosamente');
          console.log('📥 Respuesta del webhook:', response.status, response.statusText);
        } catch (webhookError: any) {
          console.error('❌ Error de webhook detallado:');
          console.error('   URL:', automation.config.webhookUrl);
          console.error('   Error:', webhookError.message);
          console.error('   Code:', webhookError.code);
          console.error('   Response status:', webhookError.response?.status);
          console.error('   Response data:', webhookError.response?.data);
          // No fallar la respuesta por error de webhook
        }
      } else {
        console.log('⚠️ No hay webhook configurado para esta automatización');
      }

      console.log('✅ Formulario procesado exitosamente');
      res.json({
        success: true,
        message: 'Formulario enviado exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error al procesar formulario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el formulario'
      });
    }
  }
} 