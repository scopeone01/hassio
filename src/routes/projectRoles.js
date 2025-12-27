import express from 'express';
import * as projectRolesController from '../controllers/projectRolesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/projectAccess.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Project Roles Management
router.get('/:projectId/roles', 
    checkProjectAccess('read'),
    projectRolesController.getRoles
);

router.post('/:projectId/roles', 
    checkProjectAccess('admin'),
    projectRolesController.createRole
);

router.get('/:projectId/roles/:roleId', 
    checkProjectAccess('read'),
    projectRolesController.getRoleById
);

router.put('/:projectId/roles/:roleId', 
    checkProjectAccess('admin'),
    projectRolesController.updateRole
);

router.delete('/:projectId/roles/:roleId', 
    checkProjectAccess('admin'),
    projectRolesController.deleteRole
);

// Role Members
router.get('/:projectId/roles/:roleId/members', 
    checkProjectAccess('read'),
    projectRolesController.getRoleMembers
);

router.post('/:projectId/roles/:roleId/members', 
    checkProjectAccess('admin'),
    projectRolesController.addRoleMember
);

router.delete('/:projectId/roles/:roleId/members/:userId', 
    checkProjectAccess('admin'),
    projectRolesController.removeRoleMember
);

export default router;








