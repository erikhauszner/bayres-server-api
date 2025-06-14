import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Employee, { IEmployee } from '../models/Employee';
import Session from '../models/EmployeeSession';
import { EmployeeStatusLog, EmployeeStatusDailyStats } from '../models/EmployeeStatusLog';
import createError from 'http-errors';

// Extender el tipo Request para incluir employee
declare global {
  namespace Express {
    interface Request {
      employee?: IEmployee | undefined; // Tipo correcto según la declaración global
    }
  }
}

/**
 * Controlador para manejar el estado y monitoreo de empleados
 */
export class EmployeeStatusController {
  /**
   * Obtiene el estado actual de todos los empleados
   * Incluye información sobre si están en línea y su último acceso
   */
  static async getEmployeesStatus(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Backend: Solicitando estado de todos los empleados');
      
      // Obtener todos los empleados
      const employees = await Employee.find({})
        .select('_id firstName lastName email position department lastLogin lastLogout isActive status')
        .lean();
      
      console.log(`Backend: Encontrados ${employees.length} empleados`);
      
      // Obtener sesiones activas - Ajustado para mejorar la precisión
      const activeSessions = await Session.find({ 
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).lean();
      
      console.log(`Backend: Encontradas ${activeSessions.length} sesiones activas`);
      
      // Crear un mapa de IDs de empleados con sesiones activas
      const activeEmployeeIds = new Map();
      activeSessions.forEach(session => {
        const employeeId = session.userId.toString();
        if (!activeEmployeeIds.has(employeeId)) {
          activeEmployeeIds.set(employeeId, {
            count: 1,
            lastSession: session
          });
        } else {
          const data = activeEmployeeIds.get(employeeId);
          data.count += 1;
          // Actualizar la última sesión si esta es más reciente
          if (new Date(session.createdAt) > new Date(data.lastSession.createdAt)) {
            data.lastSession = session;
          }
          activeEmployeeIds.set(employeeId, data);
        }
      });
      
      // Obtener estadísticas diarias para todos los empleados
      // Buscar las estadísticas sin filtrar por fecha y luego filtrar por día en memoria
      const allDailyStats = await EmployeeStatusDailyStats.find({}).lean();
      console.log(`Backend: Encontrados ${allDailyStats.length} registros de estadísticas diarias`);
      
      // Obtener la fecha actual (solo la parte de la fecha, sin la hora)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filtrar las estadísticas por la fecha actual
      const todayStats = allDailyStats.filter(stat => {
        // Convertir a fecha local y eliminar la parte de la hora
        const statDate = new Date(stat.date);
        statDate.setHours(0, 0, 0, 0);
        
        // Comparar fechas como timestamps para evitar problemas de zona horaria
        return statDate.getTime() === today.getTime();
      });
      
      console.log(`Backend: Hay ${todayStats.length} registros de estadísticas para hoy`);
      
      // Crear un mapa para acceder rápidamente a las estadísticas por ID de empleado
      const statsMap = new Map();
      todayStats.forEach(stat => {
        console.log(`Estadísticas encontradas para empleado ${stat.employeeId}: Online=${stat.onlineTime}s, Break=${stat.breakTime}s, Offline=${stat.offlineTime}s`);
        
        statsMap.set(stat.employeeId.toString(), {
          onlineTime: stat.onlineTime || 0,
          breakTime: stat.breakTime || 0,
          offlineTime: stat.offlineTime || 0
        });
      });
      
      // Formatear el tiempo
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
      };
      
      // Obtener los registros abiertos actuales para cada empleado
      const openStatusLogs = await EmployeeStatusLog.find({
        endTime: null
      }).lean();
      
      // Crear un mapa para acceder rápidamente a los registros abiertos por ID de empleado
      const openLogsMap = new Map();
      openStatusLogs.forEach(log => {
        openLogsMap.set(log.employeeId.toString(), log);
      });
      
      // Calcular estadísticas diarias para cada empleado
      const employeesWithStats = employees.map(emp => {
        const empId = emp._id.toString();
        const stats = statsMap.get(empId) || { onlineTime: 0, breakTime: 0, offlineTime: 0 };
        
        console.log(`Procesando empleado ${empId}: ${emp.firstName} ${emp.lastName}, estadísticas base: Online=${stats.onlineTime}s, Break=${stats.breakTime}s, Offline=${stats.offlineTime}s`);
        
        // Calcular tiempo de la sesión actual si está online o en pausa
        let currentSessionTime = 0;
        if ((emp.status === 'online' || emp.status === 'break') && emp.lastLogin) {
          const lastLoginTime = new Date(emp.lastLogin).getTime();
          const now = Date.now();
          currentSessionTime = Math.floor((now - lastLoginTime) / 1000); // Convertir a segundos
        }
        
        // Verificar si hay un registro abierto actual para este empleado
        const openLog = openLogsMap.get(empId);
        if (openLog) {
          const startTime = new Date(openLog.startTime).getTime();
          const now = Date.now();
          const openLogDuration = Math.floor((now - startTime) / 1000); // Duración en segundos
          
          console.log(`Empleado ${empId} tiene un registro abierto de estado "${openLog.status}" con duración de ${openLogDuration} segundos`);
          
          // Actualizar las estadísticas según el estado del registro abierto
          if (openLog.status === 'online') {
            // Sumar el tiempo del registro abierto al tiempo online
            stats.onlineTime += openLogDuration;
          } else if (openLog.status === 'break') {
            // Sumar el tiempo del registro abierto al tiempo de break
            stats.breakTime += openLogDuration;
          } else if (openLog.status === 'offline') {
            // Sumar el tiempo del registro abierto al tiempo offline
            stats.offlineTime += openLogDuration;
          }
        }
        
        // Calcular el tiempo total (registros cerrados + registro abierto actual)
        const totalTime = stats.onlineTime + stats.breakTime + stats.offlineTime;
        
        console.log(`Estadísticas finales para empleado ${empId}: Online=${stats.onlineTime}s, Break=${stats.breakTime}s, Offline=${stats.offlineTime}s, Total=${totalTime}s`);
        
        return {
          ...emp,
          statistics: {
            onlineTime: stats.onlineTime,
            breakTime: stats.breakTime,
            offlineTime: stats.offlineTime,
            onlineTimeFormatted: formatTime(stats.onlineTime),
            breakTimeFormatted: formatTime(stats.breakTime),
            offlineTimeFormatted: formatTime(stats.offlineTime),
            totalTimeFormatted: formatTime(totalTime),
            currentSessionTime,
            currentSessionTimeFormatted: formatTime(currentSessionTime)
          }
        };
      });
      
      res.json(employeesWithStats);
    } catch (error) {
      console.error('Error al obtener el estado de los empleados:', error);
      next(createError(500, 'Error al obtener el estado de los empleados'));
    }
  }
  
  /**
   * Obtiene el estado detallado de un empleado específico
   */
  static async getEmployeeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Validar el ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(400, 'ID de empleado inválido'));
      }
      
      // Buscar el empleado
      const employee = await Employee.findById(id)
        .select('_id firstName lastName email position department lastLogin lastLogout isActive')
        .lean();
        
      if (!employee) {
        return next(createError(404, 'Empleado no encontrado'));
      }
      
      // Buscar sesiones activas
      const activeSessions = await Session.find({ 
        userId: new mongoose.Types.ObjectId(id),
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).lean();
      
      // Determinar si está en línea
      const isOnline = activeSessions.length > 0;
      
      // Calcular tiempo activo basado en registros de estado online únicamente
      let activeTime = 0;
      
      // Obtener estadísticas del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyStatsForMethod1 = await EmployeeStatusDailyStats.findOne({
        employeeId: new mongoose.Types.ObjectId(id),
        date: today
      }).lean();
      
      if (dailyStatsForMethod1) {
        activeTime = Math.floor(dailyStatsForMethod1.onlineTime / 60); // Convertir segundos a minutos
        
        // Si hay un registro abierto de estado 'online', agregar su duración
        const openOnlineLog = await EmployeeStatusLog.findOne({
          employeeId: new mongoose.Types.ObjectId(id),
          status: 'online',
          endTime: null
        }).lean();
        
        if (openOnlineLog) {
          const startTime = new Date(openOnlineLog.startTime).getTime();
          const now = Date.now();
          const currentOnlineTime = Math.floor((now - startTime) / (1000 * 60)); // Convertir a minutos
          activeTime += currentOnlineTime;
        }
      }
      
      // Para el usuario actual, siempre marcarlo como online si tiene sesión válida
      const isCurrentUser = req.employee && req.employee._id && req.employee._id.toString() === id;
      const forcedOnline = isCurrentUser && isOnline;
      
      // Determinar estado
      let status = 'offline';
      if (isOnline || forcedOnline) {
        status = 'online';
      }
      
      // Obtener estadísticas detalladas del día actual
      let detailedStats = {
        onlineTime: 0,
        breakTime: 0,
        offlineTime: 0,
        currentSessionTime: 0
      };

      if (dailyStatsForMethod1) {
        detailedStats.onlineTime = dailyStatsForMethod1.onlineTime || 0;
        detailedStats.breakTime = dailyStatsForMethod1.breakTime || 0;
        detailedStats.offlineTime = dailyStatsForMethod1.offlineTime || 0;
      }

      // Calcular tiempo de sesión actual si hay un registro abierto
      const openLog = await EmployeeStatusLog.findOne({
        employeeId: new mongoose.Types.ObjectId(id),
        endTime: null
      }).lean();

      if (openLog) {
        const startTime = new Date(openLog.startTime).getTime();
        const now = Date.now();
        detailedStats.currentSessionTime = Math.floor((now - startTime) / 1000); // en segundos
      }

      // Función para formatear tiempo
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
      };

      const formatTimeSeconds = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
      };

      // Obtener información de dispositivos conectados
      const devices = activeSessions.map(session => {
        return {
          deviceInfo: session.deviceInfo || { userAgent: 'Desconocido', ipAddress: 'Desconocido' },
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        };
      });

      const totalTime = detailedStats.onlineTime + detailedStats.breakTime;
      
      res.json({
        ...employee,
        status,
        isOnline,
        activeTime, // en minutos (mantenido para compatibilidad)
        activeTimeFormatted: activeTime ? `${Math.floor(activeTime / 60)}h ${activeTime % 60}m` : '0h 0m',
        devices,
        activeSessions: activeSessions.length, // Información de diagnóstico
        statistics: {
          onlineTime: detailedStats.onlineTime,
          breakTime: detailedStats.breakTime,
          offlineTime: detailedStats.offlineTime,
          currentSessionTime: detailedStats.currentSessionTime,
          onlineTimeFormatted: formatTime(detailedStats.onlineTime),
          breakTimeFormatted: formatTime(detailedStats.breakTime),
          offlineTimeFormatted: formatTime(detailedStats.offlineTime),
          totalTimeFormatted: formatTime(totalTime),
          currentSessionTimeFormatted: detailedStats.currentSessionTime > 0 
            ? formatTimeSeconds(detailedStats.currentSessionTime) 
            : "0h 0m 0s"
        }
      });
    } catch (error) {
      console.error(`Error al obtener el estado del empleado ${req.params.id}:`, error);
      next(createError(500, 'Error al obtener el estado del empleado'));
    }
  }
  
  /**
   * Actualiza manualmente el estado de un empleado (para administradores)
   */
  static async updateEmployeeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validar el ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(400, 'ID de empleado inválido'));
      }
      
      // Validar el estado
      if (!['online', 'offline', 'break'].includes(status)) {
        return next(createError(400, 'Estado inválido. Debe ser: online, offline o break'));
      }
      
      // Buscar el empleado
      const employee = await Employee.findById(id);
      if (!employee) {
        return next(createError(404, 'Empleado no encontrado'));
      }
      
      // Registrar información de depuración
      console.log(`Actualizando estado de empleado ${id} a ${status}`);
      
      // Obtener el estado anterior del empleado
      const previousStatus = employee.status || 'offline';
      
      // Cerrar el registro anterior del estado
      await EmployeeStatusController.closeCurrentStatusLog(id, previousStatus);
      
      // Solo crear un nuevo registro si NO es offline
      // Offline significa que no hay actividad, por lo que no necesita un registro abierto
      if (status !== 'offline') {
        await EmployeeStatusController.createNewStatusLog(id, status);
      }
      
      // Manejar la actualización según el estado
      if (status === 'offline') {
        // **CORREGIDO**: NO cerrar sesiones cuando un administrador cambia estado a offline
        // El estado 'offline' significa "no disponible para trabajar" 
        // NO significa "cerrar sesión de la aplicación"
        console.log(`Administrador cambió estado del empleado ${id} a offline (no disponible) pero mantiene sus sesiones activas`);
        
        // Solo actualizar timestamp de cambio de estado (no lastLogout)
        // lastLogout debe ser solo para logout real de la aplicación
      } else if (status === 'online') {
        // Si se está forzando el estado "online", actualizar la última hora de inicio de sesión
        employee.lastLogin = new Date();
        await employee.save();
        
        console.log(`Administrador cambió estado del empleado ${id} a online (disponible)`);
      } else if (status === 'break') {
        console.log(`Administrador cambió estado del empleado ${id} a break (en descanso)`);
      }
      
      // También guardar el estado actual en el empleado para facilitar consultas
      employee.status = status;
      await employee.save();
      
      console.log(`Estado del empleado ${id} actualizado a ${status}`);
      
      // Calcular estadísticas diarias
      await EmployeeStatusController.updateDailyStats(id);
      
      res.json({ 
        message: 'Estado actualizado correctamente', 
        status,
        timestamp: new Date(),
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email
        }
      });
    } catch (error) {
      console.error(`Error al actualizar el estado del empleado ${req.params.id}:`, error);
      next(createError(500, 'Error al actualizar el estado del empleado'));
    }
  }

  /**
   * Obtiene el estado actual del empleado logueado
   */
  static async getCurrentEmployeeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Verificar que existe un empleado en la solicitud
      if (!req.employee || !req.employee._id) {
        return next(createError(401, 'No se ha autenticado ningún empleado'));
      }
      
      const employeeId = req.employee._id.toString();
      
      // Buscar el empleado y las sesiones activas directamente
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return next(createError(404, 'Empleado no encontrado'));
      }
      
      // Buscar sesiones activas
      const activeSessions = await Session.find({ 
        userId: new mongoose.Types.ObjectId(employeeId),
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).lean();
      
      // Determinar si está en línea
      const isOnline = activeSessions.length > 0;
      
      // Calcular tiempo activo basado en registros de estado online únicamente
      let activeTime = 0;
      
      // Obtener la fecha actual para buscar estadísticas
      const todayForStats = new Date();
      todayForStats.setHours(0, 0, 0, 0);
      
      // Buscar estadísticas del día
      const dailyStatsForActive = await EmployeeStatusDailyStats.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        date: todayForStats
      }).lean();
      
      if (dailyStatsForActive) {
        activeTime = Math.floor(dailyStatsForActive.onlineTime / 60); // Convertir segundos a minutos
        
        // Si hay un registro abierto de estado 'online', agregar su duración
        const openOnlineLog = await EmployeeStatusLog.findOne({
          employeeId: new mongoose.Types.ObjectId(employeeId),
          status: 'online',
          endTime: null
        }).lean();
        
        if (openOnlineLog) {
          const startTime = new Date(openOnlineLog.startTime).getTime();
          const now = Date.now();
          const currentOnlineTime = Math.floor((now - startTime) / (1000 * 60)); // Convertir a minutos
          activeTime += currentOnlineTime;
        }
      }
      
      // Si el empleado no tiene un status guardado, establecerlo basado en isOnline
      if (!employee.status) {
        employee.status = isOnline ? 'online' : 'offline';
        await employee.save();
      }
      
      // Formatear el tiempo activo
      const activeTimeFormatted = activeTime ? `${Math.floor(activeTime / 60)}h ${activeTime % 60}m` : '0h 0m';
      
      // Obtener información de dispositivos conectados
      const devices = activeSessions.map(session => {
        return {
          deviceInfo: session.deviceInfo || { userAgent: 'Desconocido', ipAddress: 'Desconocido' },
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        };
      });
      
      // Obtener la fecha actual (solo la parte de la fecha, sin la hora)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Buscar todas las estadísticas del empleado
      const employeeStats = await EmployeeStatusDailyStats.find({
        employeeId: new mongoose.Types.ObjectId(employeeId)
      }).lean();
      
      console.log(`Encontrados ${employeeStats.length} registros de estadísticas para el empleado ${employeeId}`);
      
      // Filtrar para obtener solo las estadísticas de hoy
      const dailyStats = employeeStats.find(stat => {
        const statDate = new Date(stat.date);
        statDate.setHours(0, 0, 0, 0);
        return statDate.getTime() === today.getTime();
      });
      
      if (dailyStats) {
        console.log(`Estadísticas de hoy encontradas para empleado ${employeeId}: Online=${dailyStats.onlineTime}s, Break=${dailyStats.breakTime}s, Offline=${dailyStats.offlineTime}s`);
      } else {
        console.log(`No se encontraron estadísticas para hoy para el empleado ${employeeId}`);
      }
      
      // Calcular tiempos acumulados
      const onlineTime = dailyStats?.onlineTime || 0;
      const breakTime = dailyStats?.breakTime || 0;
      const offlineTime = dailyStats?.offlineTime || 0;
      
      // Formatear los tiempos acumulados
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
      };
      
      // Buscar el registro abierto actual para este empleado
      const openStatusLog = await EmployeeStatusLog.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        endTime: null
      }).lean();
      
      let adjustedOnlineTime = onlineTime;
      let adjustedBreakTime = breakTime;
      let adjustedOfflineTime = offlineTime;
      
      // Sumar el tiempo del registro abierto si existe
      if (openStatusLog) {
        const startTime = new Date(openStatusLog.startTime).getTime();
        const now = Date.now();
        const openLogDuration = Math.floor((now - startTime) / 1000); // Duración en segundos
        
        console.log(`Empleado actual tiene un registro abierto de estado "${openStatusLog.status}" con duración de ${openLogDuration} segundos`);
        
        // Actualizar las estadísticas según el estado del registro abierto
        if (openStatusLog.status === 'online') {
          adjustedOnlineTime += openLogDuration;
        } else if (openStatusLog.status === 'break') {
          adjustedBreakTime += openLogDuration;
        } else if (openStatusLog.status === 'offline') {
          adjustedOfflineTime += openLogDuration;
        }
      }
      
      // Calcular tiempo activo de la sesión actual
      let currentSessionTime = 0;
      if ((isOnline || employee.status === 'break') && employee.lastLogin) {
        const lastLoginTime = new Date(employee.lastLogin).getTime();
        const now = Date.now();
        currentSessionTime = Math.floor((now - lastLoginTime) / 1000); // Convertir a segundos
      }
      
      // Formatear el tiempo de la sesión actual
      const currentSessionTimeFormatted = formatTime(currentSessionTime);
      
      // Calcular el tiempo total (registros cerrados + registro abierto actual)
      const totalTime = adjustedOnlineTime + adjustedBreakTime + adjustedOfflineTime;
      
      console.log(`Estadísticas finales para empleado ${employeeId}: Online=${adjustedOnlineTime}s, Break=${adjustedBreakTime}s, Offline=${adjustedOfflineTime}s, Total=${totalTime}s`);
      
      // Responder con el estado detallado y estadísticas
      res.json({
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        position: employee.position,
        department: employee.department,
        status: employee.status,
        isOnline,
        lastLogin: employee.lastLogin,
        lastLogout: employee.lastLogout,
        activeTime,
        activeTimeFormatted,
        devices,
        activeSessions: activeSessions.length,
        statistics: {
          onlineTime: adjustedOnlineTime,
          breakTime: adjustedBreakTime,
          offlineTime: adjustedOfflineTime,
          onlineTimeFormatted: formatTime(adjustedOnlineTime),
          breakTimeFormatted: formatTime(adjustedBreakTime),
          offlineTimeFormatted: formatTime(adjustedOfflineTime),
          totalTimeFormatted: formatTime(totalTime),
          currentSessionTime,
          currentSessionTimeFormatted
        }
      });
    } catch (error) {
      console.error('Error al obtener el estado del empleado actual:', error);
      next(createError(500, 'Error al obtener el estado del empleado actual'));
    }
  }
  
  /**
   * Actualiza el estado del empleado actual
   */
  static async updateCurrentEmployeeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Verificar que existe un empleado en la solicitud
      if (!req.employee || !req.employee._id) {
        return next(createError(401, 'No se ha autenticado ningún empleado'));
      }
      
      const employeeId = req.employee._id.toString();
      const { status } = req.body;
      
      // Validar el estado
      if (!['online', 'offline', 'break'].includes(status)) {
        return next(createError(400, 'Estado inválido. Debe ser: online, offline o break'));
      }
      
      // Buscar el empleado
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return next(createError(404, 'Empleado no encontrado'));
      }
      
      // Registrar información de depuración
      console.log(`Empleado ${employeeId} actualizando su propio estado a ${status}`);
      
      // Obtener el estado anterior del empleado
      const previousStatus = employee.status || 'offline';
      
      // Cerrar el registro anterior del estado
      await EmployeeStatusController.closeCurrentStatusLog(employeeId, previousStatus);
      
      // Solo crear un nuevo registro si NO es offline
      // Offline significa que no hay actividad, por lo que no necesita un registro abierto
      if (status !== 'offline') {
        await EmployeeStatusController.createNewStatusLog(employeeId, status);
      }
      
      // Manejar la actualización según el estado
      if (status === 'offline') {
        // **CORREGIDO**: NO cerrar sesiones cuando el estado es offline
        // El estado 'offline' significa "no disponible para trabajar" 
        // NO significa "cerrar sesión de la aplicación"
        console.log(`Empleado ${employeeId} cambió a estado offline (no disponible) pero mantiene su sesión activa`);
        
        // Solo actualizar timestamp de cambio de estado (no lastLogout)
        // lastLogout debe ser solo para logout real de la aplicación
      } else if (status === 'online') {
        // Actualizar último inicio de sesión si está pasando a online
        employee.lastLogin = new Date();
        console.log(`Empleado ${employeeId} cambió a estado online (disponible)`);
      } else if (status === 'break') {
        console.log(`Empleado ${employeeId} cambió a estado break (en descanso)`);
      }
      
      // Guardar el estado actual en el empleado
      employee.status = status;
      await employee.save();
      
      console.log(`Estado del empleado ${employeeId} actualizado a ${status}`);
      
      // Calcular estadísticas diarias
      await EmployeeStatusController.updateDailyStats(employeeId);
      
      // Buscar sesiones activas para la respuesta
      const activeSessions = await Session.find({ 
        userId: new mongoose.Types.ObjectId(employeeId),
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).lean();
      
      // Obtener la fecha actual (solo la parte de la fecha, sin la hora)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Buscar todas las estadísticas del empleado
      const employeeStats = await EmployeeStatusDailyStats.find({
        employeeId: new mongoose.Types.ObjectId(employeeId)
      }).lean();
      
      console.log(`Encontrados ${employeeStats.length} registros de estadísticas para el empleado ${employeeId}`);
      
      // Filtrar para obtener solo las estadísticas de hoy
      const dailyStats = employeeStats.find(stat => {
        const statDate = new Date(stat.date);
        statDate.setHours(0, 0, 0, 0);
        return statDate.getTime() === today.getTime();
      });
      
      if (dailyStats) {
        console.log(`Estadísticas de hoy encontradas para empleado ${employeeId}: Online=${dailyStats.onlineTime}s, Break=${dailyStats.breakTime}s, Offline=${dailyStats.offlineTime}s`);
      } else {
        console.log(`No se encontraron estadísticas para hoy para el empleado ${employeeId}`);
      }
      
      // Calcular tiempos acumulados
      const onlineTime = dailyStats?.onlineTime || 0;
      const breakTime = dailyStats?.breakTime || 0;
      const offlineTime = dailyStats?.offlineTime || 0;
      
      // Buscar el registro abierto actual para este empleado
      const openStatusLog = await EmployeeStatusLog.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        endTime: null
      }).lean();
      
      let adjustedOnlineTime = onlineTime;
      let adjustedBreakTime = breakTime;
      let adjustedOfflineTime = offlineTime;
      
      // Sumar el tiempo del registro abierto si existe
      if (openStatusLog) {
        const startTime = new Date(openStatusLog.startTime).getTime();
        const now = Date.now();
        const openLogDuration = Math.floor((now - startTime) / 1000); // Duración en segundos
        
        console.log(`Empleado ${employeeId} tiene un registro abierto de estado "${openStatusLog.status}" con duración de ${openLogDuration} segundos`);
        
        // Actualizar las estadísticas según el estado del registro abierto
        if (openStatusLog.status === 'online') {
          adjustedOnlineTime += openLogDuration;
        } else if (openStatusLog.status === 'break') {
          adjustedBreakTime += openLogDuration;
        } else if (openStatusLog.status === 'offline') {
          adjustedOfflineTime += openLogDuration;
        }
      }
      
      // Calcular el tiempo total (registros cerrados + registro abierto actual)
      const totalTime = adjustedOnlineTime + adjustedBreakTime + adjustedOfflineTime;
      
      console.log(`Estadísticas finales para empleado ${employeeId}: Online=${adjustedOnlineTime}s, Break=${adjustedBreakTime}s, Offline=${adjustedOfflineTime}s, Total=${totalTime}s`);
      
      // Formatear los tiempos acumulados
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
      };
      
      res.json({ 
        message: 'Estado actualizado correctamente', 
        status,
        timestamp: new Date(),
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          status: employee.status
        },
        statistics: {
          onlineTime: adjustedOnlineTime,
          breakTime: adjustedBreakTime,
          offlineTime: adjustedOfflineTime,
          onlineTimeFormatted: formatTime(adjustedOnlineTime),
          breakTimeFormatted: formatTime(adjustedBreakTime),
          offlineTimeFormatted: formatTime(adjustedOfflineTime),
          totalTimeFormatted: formatTime(totalTime)
        }
      });
    } catch (error) {
      console.error('Error al actualizar el estado del empleado actual:', error);
      next(createError(500, 'Error al actualizar el estado del empleado actual'));
    }
  }

  /**
   * Cierra todos los registros de estado abiertos para un empleado
   * @param employeeId ID del empleado
   * @param status Estado que se está cerrando (para logging)
   */
  private static async closeCurrentStatusLog(employeeId: string, status: string) {
    try {
      const now = new Date();
      
      // Buscar TODOS los registros abiertos para este empleado (sin filtrar por estado)
      const openLogs = await EmployeeStatusLog.find({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        endTime: null
      }).sort({ startTime: -1 });
      
      for (const log of openLogs) {
        // Calcular la duración
        const startTime = new Date(log.startTime).getTime();
        const endTime = now.getTime();
        const duration = Math.floor((endTime - startTime) / 1000); // Duración en segundos
        
        // Actualizar el registro
        log.endTime = now;
        log.duration = duration;
        await log.save();
        
        console.log(`Registro de estado ${log.status} cerrado para empleado ${employeeId} con duración de ${duration} segundos`);
      }
      
      if (openLogs.length === 0) {
        console.log(`No hay registros abiertos para cerrar para empleado ${employeeId}`);
      }
    } catch (error) {
      console.error(`Error al cerrar registros de estado para empleado ${employeeId}:`, error);
    }
  }

  /**
   * Crea un nuevo registro de estado
   * @param employeeId ID del empleado
   * @param status Nuevo estado
   */
  private static async createNewStatusLog(employeeId: string, status: string) {
    try {
      const now = new Date();
      
      // Crear un nuevo registro
      const newLog = new EmployeeStatusLog({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status,
        startTime: now
      });
      
      await newLog.save();
      console.log(`Nuevo registro de estado ${status} creado para empleado ${employeeId}`);
    } catch (error) {
      console.error(`Error al crear nuevo registro de estado para empleado ${employeeId}:`, error);
    }
  }

  /**
   * Actualiza las estadísticas diarias de un empleado
   * @param employeeId ID del empleado
   */
  private static async updateDailyStats(employeeId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calcular el inicio y fin del día
      const startOfDay = new Date(today);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Obtener todos los registros completados del día
      const completedLogs = await EmployeeStatusLog.find({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        startTime: { $gte: startOfDay },
        endTime: { $lte: endOfDay, $ne: null }
      });
      
      // Calcular tiempos totales por estado
      let onlineTime = 0;
      let breakTime = 0;
      let offlineTime = 0;
      
      completedLogs.forEach(log => {
        if (log.duration) {
          if (log.status === 'online') {
            onlineTime += log.duration;
          } else if (log.status === 'break') {
            breakTime += log.duration;
          } else if (log.status === 'offline') {
            offlineTime += log.duration;
          }
        }
      });
      
      // Buscar registros abiertos (activos actualmente)
      const openLog = await EmployeeStatusLog.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        startTime: { $gte: startOfDay },
        endTime: null
      });
      
      // Si hay un registro abierto, calcular su duración hasta ahora
      if (openLog) {
        const startTime = new Date(openLog.startTime).getTime();
        const now = Date.now();
        const currentDuration = Math.floor((now - startTime) / 1000); // Convertir a segundos
        
        console.log(`Registro abierto encontrado para empleado ${employeeId} con estado ${openLog.status} y duración actual de ${currentDuration} segundos`);
        
        // No sumamos esta duración aquí, ya que se calculará en tiempo real al consultar las estadísticas
        // Esto evita que se duplique al cerrar el registro
      }
      
      // Buscar todos los registros de estadísticas para este empleado
      const allEmployeeStats = await EmployeeStatusDailyStats.find({
        employeeId: new mongoose.Types.ObjectId(employeeId)
      }).lean();
      
      console.log(`Encontrados ${allEmployeeStats.length} registros históricos de estadísticas para el empleado ${employeeId}`);
      
      // Buscar el registro correspondiente a hoy
      const todayStats = allEmployeeStats.find(stat => {
        const statDate = new Date(stat.date);
        statDate.setHours(0, 0, 0, 0);
        return statDate.getTime() === today.getTime();
      });
      
      if (todayStats) {
        // Actualizar el registro existente
        console.log(`Actualizando estadísticas existentes para empleado ${employeeId} del día ${today.toDateString()}`);
        
        await EmployeeStatusDailyStats.findByIdAndUpdate(
          todayStats._id,
          {
            onlineTime,
            breakTime,
            offlineTime,
            lastCalculated: new Date()
          }
        );
      } else {
        // Crear un nuevo registro para hoy
        console.log(`Creando nuevo registro de estadísticas para empleado ${employeeId} del día ${today.toDateString()}`);
        
        const newDailyStats = new EmployeeStatusDailyStats({
          employeeId: new mongoose.Types.ObjectId(employeeId),
          date: today,
          onlineTime,
          breakTime,
          offlineTime,
          lastCalculated: new Date()
        });
        
        await newDailyStats.save();
      }
      
      console.log(`Estadísticas diarias actualizadas para empleado ${employeeId}: Online=${onlineTime}s, Break=${breakTime}s, Offline=${offlineTime}s`);
    } catch (error) {
      console.error(`Error al actualizar estadísticas diarias para empleado ${employeeId}:`, error);
    }
  }

  /**
   * Obtiene estadísticas diarias de un empleado para un rango de fechas
   */
  static async getEmployeeDailyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      // Validar el ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(400, 'ID de empleado inválido'));
      }
      
      // Validar fechas
      if (!startDate || !endDate) {
        return next(createError(400, 'Se requieren las fechas de inicio y fin'));
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(createError(400, 'Formato de fecha inválido'));
      }
      
      // Ajustar las fechas para incluir todo el día
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      // Obtener estadísticas diarias del rango
      const dailyStats = await EmployeeStatusDailyStats.find({
        employeeId: new mongoose.Types.ObjectId(id),
        date: {
          $gte: start,
          $lte: end
        }
      }).sort({ date: 1 }).lean();
      
      // Formatear tiempo
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
      };
      
      // Obtener conteo de acciones de auditoría por día
      const auditCounts = await mongoose.connection.db?.collection('auditlogs').aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(id),
            timestamp: {
              $gte: start,
              $lte: end
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        }
      ]).toArray() || [];
      
      // Crear un mapa de conteos por fecha
      const auditCountMap = new Map();
      auditCounts.forEach((item: any) => {
        auditCountMap.set(item._id, item.count);
      });
      
      // Crear array de fechas del rango
      const dateRange = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateRange.push(dateStr);
      }
      
      console.log(`Preparando estadísticas para empleado ${id} desde ${startDate} hasta ${endDate}`);
      console.log(`Encontrados ${dailyStats.length} registros de estadísticas diarias`);
      
      // Formatear respuesta incluyendo días sin datos
      const formattedStats = dateRange.map(dateStr => {
        const stats = dailyStats.find(stat => {
          const statDateStr = new Date(stat.date).toISOString().split('T')[0];
          return statDateStr === dateStr;
        });
        
        const onlineTime = stats?.onlineTime || 0;
        const breakTime = stats?.breakTime || 0;
        const offlineTime = stats?.offlineTime || 0;
        // El tiempo total debe ser solo onlineTime + breakTime (tiempo de trabajo registrado)
        // No incluir offlineTime ya que no es tiempo productivo
        const totalTime = onlineTime + breakTime;
        const actionsCount = auditCountMap.get(dateStr) || 0;
        
        if (stats) {
          console.log(`Día ${dateStr}: Online=${onlineTime}s, Break=${breakTime}s, Offline=${offlineTime}s, Total=${totalTime}s, Acciones=${actionsCount}`);
        }
        
        return {
          date: dateStr,
          onlineTime,
          breakTime,
          offlineTime,
          totalTime,
          onlineTimeFormatted: formatTime(onlineTime),
          breakTimeFormatted: formatTime(breakTime),
          offlineTimeFormatted: formatTime(offlineTime),
          totalTimeFormatted: formatTime(totalTime),
          actionsCount
        };
      });
      
      console.log(`Devolviendo ${formattedStats.length} registros estadísticos`);
      res.json(formattedStats);
    } catch (error) {
      console.error(`Error al obtener estadísticas diarias del empleado ${req.params.id}:`, error);
      next(createError(500, 'Error al obtener estadísticas diarias del empleado'));
    }
  }
} 