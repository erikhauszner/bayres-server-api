import { Request, Response, NextFunction } from 'express';
import Role from '../models/Role';
import Permission from '../models/Permission';
import mongoose from 'mongoose';

export class RoleController {
  /**
   * Obtiene todos los roles
   */
  static async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await Role.find()
        .select('-__v')
        .populate({
          path: 'permissions',
          select: 'name description module action isActive',
          model: Permission,
          options: { lean: true }
        });

      // Eliminar duplicados de permisos en cada rol usando un Map
      const uniqueRoles = roles.map(role => {
        const roleObj = role.toObject();
        const uniquePermissions = new Map();
        
        // Usar Map para eliminar duplicados basados en el _id
        roleObj.permissions?.forEach(permission => {
          if (permission && permission._id) {
            uniquePermissions.set(permission._id.toString(), permission);
          }
        });

        return {
          ...roleObj,
          permissions: Array.from(uniquePermissions.values())
        };
      });

      res.json(uniqueRoles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene un rol por su ID
   */
  static async getRoleById(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      const role = await Role.findById(roleId)
        .populate('permissions', 'name description module action isActive');
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crea un nuevo rol
   */
  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, permissions, isActive } = req.body;
      
      // Verificar si el rol ya existe
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({ message: 'Ya existe un rol con este nombre' });
      }
      
      let permissionIds: mongoose.Types.ObjectId[] = [];
      
      // Verificar que los permisos existan
      if (permissions && Array.isArray(permissions)) {
        // Comprobar si los permisos se proporcionan como nombres ("module:action")
        if (permissions.length > 0 && typeof permissions[0] === 'string' && permissions[0].includes(':')) {
          console.log('Buscando permisos por nombre:', permissions);
          
          // Buscar permisos por nombre
          const permissionDocs = await Permission.find({ 
            name: { $in: permissions } 
          });
          
          if (permissionDocs.length !== permissions.length) {
            const foundPermissions = permissionDocs.map(p => p.name);
            const missingPermissions = permissions.filter(p => !foundPermissions.includes(p as string));
            console.warn('Permisos no encontrados:', missingPermissions);
            
            return res.status(400).json({ 
              message: 'Uno o más permisos no existen en la base de datos', 
              missingPermissions 
            });
          }
          
          permissionIds = permissionDocs.map(p => p._id) as mongoose.Types.ObjectId[];
        } 
        // Si se proporcionan como ObjectIDs
        else {
          try {
            // Intentar verificar si son ObjectIDs válidos
            const validObjectIds = permissions.filter(id => 
              mongoose.Types.ObjectId.isValid(id as string)
            );
            
            if (validObjectIds.length !== permissions.length) {
              return res.status(400).json({ 
                message: 'Formato de permisos inválido. Deben ser IDs válidos o nombres en formato module:action' 
              });
            }
            
            const validPermissions = await Permission.find({
              _id: { $in: permissions }
            });
            
            if (validPermissions.length !== permissions.length) {
              return res.status(400).json({ message: 'Uno o más permisos no son válidos' });
            }
            
            permissionIds = validPermissions.map(p => p._id) as mongoose.Types.ObjectId[];
          } catch (error) {
            console.error('Error validando permisos:', error);
            return res.status(400).json({ message: 'Error al validar permisos' });
          }
        }
      }
      
      // Crear el nuevo rol con los IDs de permisos
      const role = new Role({
        name,
        description,
        permissions: permissionIds,
        isActive: isActive !== undefined ? isActive : true,
        isSystem: false
      });
      
      await role.save();
      const populatedRole = await Role.findById(role._id)
        .populate('permissions', 'name description module action isActive');
      res.status(201).json(populatedRole);
    } catch (error) {
      console.error('Error creando rol:', error);
      next(error);
    }
  }

  /**
   * Actualiza un rol existente
   */
  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      const { name, description, permissions, isActive } = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      // Obtener el rol
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      let permissionIds: mongoose.Types.ObjectId[] = [];
      
      // Si se proporcionan permisos, buscarlos por nombre y obtener sus IDs
      if (permissions && Array.isArray(permissions)) {
        // Verificar si son strings con formato "module:action"
        if (permissions.length > 0 && typeof permissions[0] === 'string' && permissions[0].includes(':')) {
          const permissionDocs = await Permission.find({ name: { $in: permissions } });
          
          if (permissionDocs.length !== permissions.length) {
            const foundPermissions = permissionDocs.map(p => p.name);
            const missingPermissions = permissions.filter(p => !foundPermissions.includes(p as string));
            console.warn('Permisos no encontrados:', missingPermissions);
            return res.status(400).json({ 
              message: 'Uno o más permisos no existen en la base de datos', 
              missingPermissions 
            });
          }
          
          permissionIds = permissionDocs.map(p => p._id) as mongoose.Types.ObjectId[];
        } else {
          // Asumir que ya son ObjectIDs
          const validPermissions = await Permission.find({
            _id: { $in: permissions }
          });
          
          if (validPermissions.length !== permissions.length) {
            return res.status(400).json({ message: 'Uno o más permisos no son válidos' });
          }
          
          permissionIds = validPermissions.map(p => p._id) as mongoose.Types.ObjectId[];
        }
      }
      
      // Actualizar el rol
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { 
          name, 
          description, 
          permissions: permissionIds.length > 0 ? permissionIds : undefined,
          isActive 
        },
        { new: true }
      ).populate('permissions', 'name description module action isActive');
      
      res.json(updatedRole);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un rol
   */
  static async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      // Eliminar el rol (ahora permitimos eliminar roles del sistema)
      await Role.findByIdAndDelete(roleId);
      res.json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activa/desactiva un rol
   */
  static async toggleRoleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { isActive: !role.isActive },
        { new: true }
      ).populate('permissions', 'name description module action isActive');
      
      res.json(updatedRole);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene los permisos de un rol
   */
  static async getRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      const role = await Role.findById(roleId)
        .populate('permissions', 'name description module action isActive');
      
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      res.json(role.permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Agrega permisos a un rol
   */
  static async addPermissionToRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      const { permissionIds } = req.body as { permissionIds: string[] };
      
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({ message: 'ID de rol no válido' });
      }
      
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      // Verificar que los permisos existan
      const validPermissions = await Permission.find({
        _id: { $in: permissionIds }
      });
      
      if (validPermissions.length !== permissionIds.length) {
        return res.status(400).json({ message: 'Uno o más permisos no son válidos' });
      }
      
      // Eliminar duplicados usando Set y convertir a ObjectId
      const uniquePermissionIds = [...new Set(permissionIds)];
      const existingPermissionIds = role.permissions.map(p => p.toString());
      
      // Filtrar permisos que ya existen
      const newPermissionIds = uniquePermissionIds.filter(
        id => !existingPermissionIds.includes(id)
      );
      
      // Agregar solo los permisos nuevos
      const updatedPermissions = [
        ...role.permissions,
        ...newPermissionIds.map(id => new mongoose.Types.ObjectId(id))
      ];
      
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { permissions: updatedPermissions },
        { new: true }
      ).populate('permissions', 'name description module action isActive');
      
      res.json(updatedRole);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remueve permisos de un rol
   */
  static async removePermissionFromRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.id;
      const permissionId = req.params.permissionId;
      
      if (!mongoose.Types.ObjectId.isValid(roleId) || !mongoose.Types.ObjectId.isValid(permissionId)) {
        return res.status(400).json({ message: 'ID no válido' });
      }
      
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }
      
      // Remover el permiso
      const updatedPermissions = role.permissions.filter(
        (p: any) => p.toString() !== permissionId
      );
      
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { permissions: updatedPermissions },
        { new: true }
      ).populate('permissions', 'name description module action isActive');
      
      res.json(updatedRole);
    } catch (error) {
      next(error);
    }
  }
} 