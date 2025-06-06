import RoleModel from '../models/Role';
import PermissionModel from '../models/Permission';
import { IPermission } from '../models/Permission';

/**
 * Inicializa los roles y permisos básicos del sistema
 */
async function initializeRoles() {
  try {
    console.log('Verificando roles y permisos básicos...');
    
    // Verificar si ya existe el rol de administrador
    const adminRole = await RoleModel.findOne({ name: 'Administrador' });
    
    if (!adminRole) {
      console.log('Creando rol de Administrador...');
      
      // Obtener todos los permisos
      const allPermissions = await PermissionModel.find({});
      
      if (allPermissions.length === 0) {
        console.log('No hay permisos definidos en el sistema. Saltando inicialización de roles.');
        return;
      }
      
      // Crear rol de administrador con todos los permisos
      await RoleModel.create({
        name: 'Administrador',
        description: 'Rol con acceso completo al sistema',
        permissions: allPermissions.map((p: IPermission) => p._id),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Rol de Administrador creado exitosamente.');
    } else {
      console.log('Rol de Administrador ya existe.');
    }
    
    console.log('Inicialización de roles completada.');
  } catch (error) {
    console.error('Error al inicializar roles:', error);
  }
}

export default initializeRoles; 