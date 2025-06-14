import { Request, Response, NextFunction } from 'express';
import Employee from '../models/Employee';
import { Lead } from '../models/Lead';
import { Task } from '../models/Task';
import { Opportunity } from '../models/Opportunity';

export class DashboardController {
  /**
   * Devuelve métricas resumidas para el dashboard del usuario actual
   * - employeesOnline: Empleados con status "online"
   * - assignedLeads: Leads asignados al usuario
   * - pendingTasks: Tareas pendientes o en progreso asignadas al usuario
   * - leadsToReview: Leads pendientes de aprobación (isApproved = false)
   * - leadsToAssign: Leads aprobados sin asignar
   * - myOpportunities: Oportunidades donde el usuario es el comisionista original
   * - activeOpportunities: Oportunidades donde el usuario es vendedor asignado o colaborador
   */
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.employee?._id;
      if (!employeeId) {
        return res.status(401).json({ message: 'Empleado no autenticado' });
      }

      // Empleados online
      const employeesOnlinePromise = Employee.countDocuments({ status: 'online' });

      // Leads asignados al usuario
      const assignedLeadsPromise = Lead.countDocuments({ assignedTo: employeeId });

      // Tareas pendientes o en progreso asignadas al usuario
      const pendingTasksPromise = Task.countDocuments({
        assignedTo: employeeId,
        status: { $in: ['pending', 'in_progress'] }
      });

      // Leads pendientes de aprobación
      const leadsToReviewPromise = Lead.countDocuments({ isApproved: false });

      // Leads aprobados sin asignar
      const leadsToAssignPromise = Lead.countDocuments({
        isApproved: true,
        $or: [
          { assignedTo: { $exists: false } },
          { assignedTo: null }
        ]
      });

      // Mis oportunidades (donde soy el comisionista original)
      const myOpportunitiesPromise = Opportunity.countDocuments({ 
        originalAgent: employeeId 
      });

      // Oportunidades activas (donde soy vendedor asignado o colaborador)
      const activeOpportunitiesPromise = Opportunity.countDocuments({
        $or: [
          { salesAgent: employeeId },
          { collaborators: employeeId }
        ],
        status: { $nin: ['cerrada_ganada', 'cerrada_perdida'] }
      });

      const [employeesOnline, assignedLeads, pendingTasks, leadsToReview, leadsToAssign, myOpportunities, activeOpportunities] = await Promise.all([
        employeesOnlinePromise,
        assignedLeadsPromise,
        pendingTasksPromise,
        leadsToReviewPromise,
        leadsToAssignPromise,
        myOpportunitiesPromise,
        activeOpportunitiesPromise
      ]);

      res.json({
        employeesOnline,
        assignedLeads,
        pendingTasks,
        leadsToReview,
        leadsToAssign,
        myOpportunities,
        activeOpportunities
      });
    } catch (error) {
      next(error);
    }
  }
} 