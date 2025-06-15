import mongoose from 'mongoose';
import Employee from '../models/Employee';
import { EmployeeStatusLog } from '../models/EmployeeStatusLog';

/**
 * Servicio para manejar la desconexión automática de empleados
 * que han estado en estado "online" por más de 3 horas
 */
export class AutoDisconnectService {
  private static readonly MAX_ONLINE_TIME = 3 * 60 * 60 * 1000; // 3 horas en milisegundos

  /**
   * Verifica y desconecta automáticamente empleados que han estado online por más de 3 horas
   */
  static async checkAndDisconnectInactiveEmployees(): Promise<void> {
    try {
      console.log('AutoDisconnectService: Iniciando verificación de empleados inactivos...');
      
      // Buscar todos los empleados que están actualmente en estado "online"
      const onlineEmployees = await Employee.find({ 
        status: 'online',
        isActive: true 
      }).lean();

      console.log(`AutoDisconnectService: Encontrados ${onlineEmployees.length} empleados en línea`);

      let disconnectedCount = 0;

      for (const employee of onlineEmployees) {
        // Buscar el registro de estado actual (abierto) para este empleado
        const currentStatusLog = await EmployeeStatusLog.findOne({
          employeeId: employee._id,
          status: 'online',
          endTime: null // Registro abierto
        }).lean();

        if (currentStatusLog) {
          const startTime = new Date(currentStatusLog.startTime).getTime();
          const currentTime = Date.now();
          const timeOnline = currentTime - startTime;

          console.log(`AutoDisconnectService: Empleado ${employee.firstName} ${employee.lastName} lleva ${Math.floor(timeOnline / (1000 * 60))} minutos en línea`);

          // Si ha estado online por más de 3 horas, desconectarlo automáticamente
          if (timeOnline > this.MAX_ONLINE_TIME) {
            await this.disconnectEmployee(employee._id.toString());
            disconnectedCount++;
            
            console.log(`AutoDisconnectService: Empleado ${employee.firstName} ${employee.lastName} desconectado automáticamente por inactividad (${Math.floor(timeOnline / (1000 * 60 * 60))} horas)`);
          }
        }
      }

      console.log(`AutoDisconnectService: Proceso completado. ${disconnectedCount} empleados desconectados por inactividad`);
    } catch (error) {
      console.error('AutoDisconnectService: Error al verificar empleados inactivos:', error);
    }
  }

  /**
   * Desconecta automáticamente a un empleado específico
   */
  private static async disconnectEmployee(employeeId: string): Promise<void> {
    try {
      // Cerrar el registro de estado actual
      const currentStatusLog = await EmployeeStatusLog.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: 'online',
        endTime: null
      });

      if (currentStatusLog) {
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - currentStatusLog.startTime.getTime()) / 1000);
        
        currentStatusLog.endTime = endTime;
        currentStatusLog.duration = duration;
        await currentStatusLog.save();
      }

      // Actualizar el estado del empleado a "offline"
      await Employee.findByIdAndUpdate(employeeId, {
        status: 'offline',
        lastLogout: new Date()
      });

      console.log(`AutoDisconnectService: Empleado ${employeeId} desconectado automáticamente`);
    } catch (error) {
      console.error(`AutoDisconnectService: Error al desconectar empleado ${employeeId}:`, error);
    }
  }

  /**
   * Inicia el servicio de verificación periódica (cada 15 minutos)
   */
  static startPeriodicCheck(): void {
    console.log('AutoDisconnectService: Iniciando verificación periódica cada 15 minutos...');
    
    // Ejecutar inmediatamente
    this.checkAndDisconnectInactiveEmployees();
    
    // Programar ejecución cada 15 minutos
    setInterval(() => {
      this.checkAndDisconnectInactiveEmployees();
    }, 15 * 60 * 1000); // 15 minutos
  }
} 