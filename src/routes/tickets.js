import express from 'express';
import * as ticketsController from '../controllers/ticketsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess, requirePermission } from '../middleware/projectAccess.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get assignable users for a ticket
router.get('/:ticketId/assignable-users', 
    authenticateToken,
    ticketsController.getAssignableUsers
);

// Assign ticket
router.post('/:ticketId/assign', 
    authenticateToken,
    ticketsController.assignTicket
);

// Manage watchers
router.get('/:ticketId/watchers', 
    authenticateToken,
    ticketsController.getWatchers
);

router.post('/:ticketId/watchers', 
    authenticateToken,
    ticketsController.addWatcher
);

router.delete('/:ticketId/watchers/:userId', 
    authenticateToken,
    ticketsController.removeWatcher
);

export default router;








