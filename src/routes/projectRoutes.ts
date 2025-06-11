import express, { Request, Response } from 'express';
import {
  getProjects,
  getProjectById,
  getProjectsByClient,
  createProject,
  updateProject,
  deleteProject,
  updateProjectStatus,
  getProjectFinances,
  addProjectExpense,
  uploadProjectDocument,
  deleteProjectDocument
} from '../controllers/projectController';
import {
  getProjectTasks,
  getProjectTaskById,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  updateProjectTaskDates
} from '../controllers/projectTaskController';
import {
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment
} from '../controllers/projectTaskCommentController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authz.middleware';
import { auditCreation, auditUpdate, auditDeletion } from '../middleware/audit.middleware';
import multer from 'multer';
import path from 'path';

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directorio donde se guardarán los archivos
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de proyectos
router.get('/', authorize(['projects:read']), getProjects);
router.get('/:id', authorize(['projects:read']), getProjectById);
router.get('/client/:clientId', authorize(['projects:read']), getProjectsByClient);
router.post('/', 
  authorize(['projects:create']), 
  auditCreation('proyecto', { module: 'proyectos' }),
  createProject
);
router.put('/:id', 
  authorize(['projects:update']), 
  auditUpdate('proyecto', { module: 'proyectos' }),
  updateProject
);
router.put('/:id/status', 
  authorize(['projects:update']), 
  auditUpdate('proyecto', { module: 'proyectos' }),
  updateProjectStatus
);
router.delete('/:id', 
  authorize(['projects:delete']), 
  auditDeletion('proyecto', { module: 'proyectos' }),
  deleteProject
);

// Rutas financieras del proyecto
router.get('/:id/finances', authorize(['projects:read']), getProjectFinances);
router.post('/:id/expenses', 
  authorize(['projects:update']), 
  auditCreation('gasto', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.id,
    getDescription: (req) => `Creación de gasto en proyecto ID: ${req.params.id}`
  }),
  addProjectExpense
);

// Rutas de tareas de proyectos
router.get('/:projectId/tasks', authorize(['projects:read']), getProjectTasks);
router.get('/:projectId/tasks/:taskId', authorize(['projects:read']), getProjectTaskById);
router.post('/:projectId/tasks', 
  authorize(['projects:update']), 
  auditCreation('tarea', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.taskId || '',
    getDescription: (req) => `Creación de tarea en proyecto ID: ${req.params.projectId}`
  }),
  createProjectTask
);
router.put('/:projectId/tasks/:taskId', 
  authorize(['projects:update']), 
  auditUpdate('tarea', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.taskId,
    getDescription: (req) => `Actualización de tarea ID: ${req.params.taskId} en proyecto ID: ${req.params.projectId}`
  }),
  updateProjectTask
);
router.patch('/:projectId/tasks/:taskId/dates', 
  authorize(['projects:update']), 
  auditUpdate('tarea', { 
    module: 'proyectos',
    action: 'actualización_fechas',
    getTargetId: (req) => req.params.taskId,
    getDescription: (req) => `Actualización de fechas de tarea ID: ${req.params.taskId}`
  }),
  updateProjectTaskDates
);
router.delete('/:projectId/tasks/:taskId', 
  authorize(['projects:delete']), 
  auditDeletion('tarea', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.taskId,
    getDescription: (req) => `Eliminación de tarea ID: ${req.params.taskId}`
  }),
  deleteProjectTask
);

// Rutas de comentarios de tareas
router.get('/:projectId/tasks/:taskId/comments', authorize(['projects:read']), getTaskComments);
router.post('/:projectId/tasks/:taskId/comments', 
  authorize(['projects:update']), 
  auditCreation('comentario', { 
    module: 'proyectos',
    getDescription: (req) => `Creación de comentario en tarea ID: ${req.params.taskId}`
  }),
  createTaskComment
);
router.put('/:projectId/tasks/:taskId/comments/:commentId', 
  authorize(['projects:update']), 
  auditUpdate('comentario', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.commentId,
    getDescription: (req) => `Actualización de comentario ID: ${req.params.commentId}`
  }),
  updateTaskComment
);
router.delete('/:projectId/tasks/:taskId/comments/:commentId', 
  authorize(['projects:update']), 
  auditDeletion('comentario', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.commentId,
    getDescription: (req) => `Eliminación de comentario ID: ${req.params.commentId}`
  }),
  deleteTaskComment
);

// Rutas para documentos de proyectos
router.post('/:id/documents', 
  authorize(['projects:update']), 
  upload.single('file'),
  auditCreation('documento', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.id,
    getDescription: (req) => `Nuevo documento en proyecto ID: ${req.params.id}`
  }),
  uploadProjectDocument
);

router.delete('/:id/documents/:documentId', 
  authorize(['projects:update']), 
  auditDeletion('documento', { 
    module: 'proyectos',
    getTargetId: (req) => req.params.documentId,
    getDescription: (req) => `Eliminación de documento ID: ${req.params.documentId} en proyecto ID: ${req.params.id}`
  }),
  deleteProjectDocument
);

export default router; 