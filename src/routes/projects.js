import express from 'express';
import * as projectsController from '../controllers/projectsController.js';
import * as ticketsController from '../controllers/ticketsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { canManageProjects } from '../middleware/admin.js';
import { checkProjectAccess } from '../middleware/projectAccess.js';

const router = express.Router();

// Get all projects (user-specific, only projects they have access to)
router.get('/', authenticateToken, projectsController.getProjects);

// Create new project (admin only)
router.post('/', authenticateToken, canManageProjects, projectsController.createProject);

// IMPORTANT: Specific routes must come BEFORE the generic /:id route
// Create ticket for a project
router.post('/:id/tickets', authenticateToken, checkProjectAccess('read'), ticketsController.createTicket);

// Get buildings for a project
router.get('/:id/buildings', authenticateToken, checkProjectAccess('read'), projectsController.getProjectBuildings);

// Get a single project by ID (must come after specific routes)
router.get('/:id', authenticateToken, projectsController.getProjectById);

// Update project (admin only)
router.put('/:id', authenticateToken, canManageProjects, projectsController.updateProject);

// Delete project (admin only)
router.delete('/:id', authenticateToken, canManageProjects, projectsController.deleteProject);

export default router;

