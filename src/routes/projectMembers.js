import express from 'express';
// Import associations first to ensure they're registered
import '../models/associations.js';
import * as projectMembersController from '../controllers/projectMembersController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/projectAccess.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Project Members Management
router.get('/:projectId/members', 
    checkProjectAccess('read'),
    projectMembersController.getMembers
);

router.post('/:projectId/members', 
    checkProjectAccess('admin'),
    projectMembersController.addMember
);

router.put('/:projectId/members/:userId', 
    checkProjectAccess('admin'),
    projectMembersController.updateMember
);

router.delete('/:projectId/members/:userId', 
    checkProjectAccess('admin'),
    projectMembersController.removeMember
);

// IMPORTANT: Specific routes must come BEFORE routes with parameters
// Support both :id and :projectId parameter names for available members
router.get('/:projectId/members/available', 
    checkProjectAccess('read'),
    projectMembersController.getAvailableMembers
);

// Also support :id for consistency
router.get('/:id/members/available', 
    checkProjectAccess('read'),
    projectMembersController.getAvailableMembers
);

// Filter by user type (must come before /:userId routes)
router.get('/:projectId/members/technicians', 
    checkProjectAccess('read'),
    projectMembersController.getTechnicians
);

router.get('/:projectId/members/contacts', 
    checkProjectAccess('read'),
    projectMembersController.getContacts
);

router.get('/:projectId/members/managers', 
    checkProjectAccess('read'),
    projectMembersController.getManagers
);

// User availability (must come after /available route)
router.get('/:projectId/members/:userId/availability', 
    checkProjectAccess('read'),
    projectMembersController.getUserAvailability
);

// User permissions
router.get('/:projectId/members/:userId/permissions', 
    checkProjectAccess('read'),
    projectMembersController.getUserPermissions
);

export default router;

