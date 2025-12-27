import express from 'express';
import * as usersController from '../controllers/usersController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, canManageUsers } from '../middleware/admin.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, usersController.getUsers);

// Get single user by ID
router.get('/:id', usersController.getUserById);

// Create new user (admin only)
router.post('/', canManageUsers, usersController.createUser);

// Update user (admin or own profile)
router.put('/:id', usersController.updateUser);

// Delete user (admin only)
router.delete('/:id', requireAdmin, usersController.deleteUser);

// Assign user to project
router.post('/:id/projects/:projectId', canManageUsers, usersController.assignUserToProject);

// Remove user from project
router.delete('/:id/projects/:projectId', canManageUsers, usersController.removeUserFromProject);

export default router;








