import express, { Request, Response } from 'express';
import {
  getProjects,
  getProjectById,
  getProjectsByClient,
  createProject,
  updateProject,
  deleteProject
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

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de proyectos
router.get('/', authorize(['projects:read']), getProjects);
router.get('/:id', authorize(['projects:read']), getProjectById);
router.get('/client/:clientId', authorize(['projects:read']), getProjectsByClient);
router.post('/', authorize(['projects:create']), createProject);
router.put('/:id', authorize(['projects:update']), updateProject);
router.delete('/:id', authorize(['projects:delete']), deleteProject);

// Rutas de tareas de proyectos
router.get('/:projectId/tasks', authorize(['projects:read']), getProjectTasks);
router.get('/:projectId/tasks/:taskId', authorize(['projects:read']), getProjectTaskById);
router.post('/:projectId/tasks', authorize(['projects:update']), createProjectTask);
router.put('/:projectId/tasks/:taskId', authorize(['projects:update']), updateProjectTask);
router.patch('/:projectId/tasks/:taskId/dates', authorize(['projects:update']), updateProjectTaskDates);
router.delete('/:projectId/tasks/:taskId', authorize(['projects:delete']), deleteProjectTask);

// Rutas de comentarios de tareas
router.get('/:projectId/tasks/:taskId/comments', authorize(['projects:read']), getTaskComments);
router.post('/:projectId/tasks/:taskId/comments', authorize(['projects:update']), createTaskComment);
router.put('/:projectId/tasks/:taskId/comments/:commentId', authorize(['projects:update']), updateTaskComment);
router.delete('/:projectId/tasks/:taskId/comments/:commentId', authorize(['projects:update']), deleteTaskComment);

export default router; 