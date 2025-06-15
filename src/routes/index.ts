import { Router } from 'express';
import employeeRoutes from './employee.routes';
import authRoutes from './auth.routes';
import notificationRoutes from './notification.routes';
import permissionRoutes from './permission.routes';
import roleRoutes from './role.routes';
import metricRoutes from './metric.routes';
import reportRoutes from './report.routes';
import clientRoutes from './client.routes';
import campaignRoutes from './campaign.routes';
import taskRoutes from './task.routes';
import leadRoutes from './lead.routes';
import { opportunityRoutes } from './opportunity.routes';
import projectRoutes from './projectRoutes';
import financeRoutes from './finance.routes';
import appConfigRoutes from './appConfig.routes';
import apiKeyRoutes from './apiKey.routes';
import leadCategoryRoutes from './lead-category.routes';
import departmentRoutes from './department.routes';
import employeeStatusRoutes from './employee-status.routes';
import auditRoutes from './audit.routes';
import scheduledNotificationRoutes from './scheduledNotification.routes';
import dashboardRoutes from './dashboard.routes';
import automationRoutes from './automation.routes';
import sessionStatsRoutes from './session-stats.routes';
import sessionRoutes from './session.routes';

const router = Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de empleados
router.use('/employees', employeeRoutes);

// Rutas de estado de empleados
router.use('/employees', employeeStatusRoutes);

// Rutas de notificaciones
router.use('/notifications', notificationRoutes);

// Rutas de clientes
router.use('/clients', clientRoutes);

// Rutas de campañas
router.use('/campaigns', campaignRoutes);

// Rutas de tareas
router.use('/tasks', taskRoutes);

// Rutas de métricas
router.use('/metrics', metricRoutes);

// Rutas de informes
router.use('/reports', reportRoutes);

// Rutas de permisos
router.use('/permissions', permissionRoutes);

// Rutas de roles
router.use('/roles', roleRoutes);

// Rutas de leads
router.use('/leads', leadRoutes);

// Rutas de oportunidades
router.use('/opportunities', opportunityRoutes);

// Rutas de proyectos
router.use('/projects', projectRoutes);

// Rutas de finanzas
router.use('/finance', financeRoutes);

// Rutas de configuración de aplicaciones
router.use('/app-config', appConfigRoutes);

// Rutas de API keys
router.use('/api-keys', apiKeyRoutes);

// Rutas de categorías de leads
router.use('/leads/categories', leadCategoryRoutes);

// Rutas de departamentos
router.use('/departments', departmentRoutes);

// Rutas de auditoría
router.use('/audit', auditRoutes);

// Rutas de dashboard
router.use('/dashboard', dashboardRoutes);

// Rutas de notificaciones programadas
router.use('/scheduled-notifications', scheduledNotificationRoutes);

// Rutas de automatizaciones
router.use('/automations', automationRoutes);

// Rutas de estadísticas de sesiones
router.use('/sessions', sessionStatsRoutes);

// Rutas de gestión de sesiones
router.use('/sessions', sessionRoutes);

export default router; 