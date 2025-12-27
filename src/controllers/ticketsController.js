import projectAccessService from '../services/projectAccessService.js';
import notificationService, { NOTIFICATION_EVENTS } from '../services/notificationService.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import Ticket from '../models/Ticket.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// GET /api/v1/projects/:projectId/tickets
export const getProjectTickets = async (req, res) => {
  try {
    // Support both :id and :projectId parameter names
    const projectId = req.params.projectId || req.params.id || req.projectId;

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required',
      });
    }

    // Use project from middleware if available, otherwise fetch it
    let project = req.project;
    if (!project) {
      project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    // Use projectAccess from middleware if available, otherwise check manually
    const userAccess = req.projectAccess || await UserProjectAccess.findOne({
      where: { userId: req.user.id, projectId },
    });

    if (!userAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Fetch all tickets for this project
    const tickets = await Ticket.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Format tickets for response
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedToId: ticket.assignedToId,
      assignedToName: ticket.assignedTo
        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
        : null,
      createdById: ticket.createdById,
      createdByName: ticket.createdBy
        ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`
        : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    res.status(200).json(formattedTickets);
  } catch (error) {
    console.error('Error fetching project tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

// POST /api/v1/projects/:projectId/tickets
export const createTicket = async (req, res) => {
  try {
    // Support both :id and :projectId parameter names
    const projectId = req.params.projectId || req.params.id || req.projectId;
    
    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required',
      });
    }
    
    // Handle both JSON and FormData
    const {
      title,
      description,
      category,
      priority = 'normal',
      assignedToId,
      buildingId,
      floor,
      room,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body;

    // Debug logging (remove in production)
    console.log('Create ticket request body:', {
      title: title?.substring(0, 50),
      description: description?.substring(0, 50),
      category,
      priority,
      hasTitle: !!title,
      hasDescription: !!description,
      hasCategory: !!category,
    });

    // Validation - check for empty strings as well
    if (!title || title.trim() === '') {
      return res.status(400).json({
        error: 'title is required',
      });
    }
    
    if (!description || description.trim() === '') {
      return res.status(400).json({
        error: 'description is required',
      });
    }
    
    if (!category || category.trim() === '') {
      return res.status(400).json({
        error: 'category is required',
      });
    }

    // Use project from middleware if available, otherwise fetch it
    let project = req.project;
    if (!project) {
      console.log('Project not in request, fetching...');
      try {
        project = await Project.findByPk(projectId);
      } catch (error) {
        console.error('Error finding project:', error);
        return res.status(500).json({ error: 'Error finding project' });
      }
      
      if (!project) {
        console.error('Project not found:', projectId);
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    // Use projectAccess from middleware if available, otherwise check manually
    const userAccess = req.projectAccess || await UserProjectAccess.findOne({
      where: { userId: req.user.id, projectId },
    });

    if (!userAccess) {
      console.error('User access not found:', { userId: req.user.id, projectId });
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Check if user can create tickets
    if (!userAccess.canCreateTickets) {
      return res.status(403).json({ error: 'You do not have permission to create tickets' });
    }

    // Generate ticket number
    const ticketCount = await Ticket.count({ where: { projectId } });
    const ticketNumber = `${project.projectNumber}-TKT-${String(ticketCount + 1).padStart(4, '0')}`;

    // Build full description with contact info
    let fullDescription = description;
    if (contactName || contactEmail || contactPhone) {
      fullDescription += '\n\n--- Kontaktinformationen ---';
      if (contactName) fullDescription += `\nName: ${contactName}`;
      if (contactEmail) fullDescription += `\nE-Mail: ${contactEmail}`;
      if (contactPhone) fullDescription += `\nTelefon: ${contactPhone}`;
    }

    // Create ticket
    const ticket = await Ticket.create({
      projectId,
      ticketNumber,
      title,
      description: fullDescription,
      category,
      priority: priority.charAt(0).toUpperCase() + priority.slice(1), // Capitalize first letter
      status: 'New',
      assignedToId: assignedToId || null,
      createdById: req.user.id,
    });

    // Send notifications if needed
    if (assignedToId) {
      const assignedUserAccess = await UserProjectAccess.findOne({
        where: { userId: assignedToId, projectId },
      });

      if (assignedUserAccess && assignedUserAccess.receiveNotifications) {
        await notificationService.sendNotification({
          userId: assignedToId,
          projectId,
          type: NOTIFICATION_EVENTS.TICKET_ASSIGNED,
          title: 'Neues Ticket zugewiesen',
          body: `Ticket ${ticketNumber}: ${title}`,
          ticketId: ticket.id,
          channels: assignedUserAccess.notificationChannels,
          priority: 'normal',
        });
      }
    }

    res.status(201).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt,
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

// GET /api/v1/tickets/:ticketId/assignable-users
export const getAssignableUsers = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // In production: Fetch ticket and get projectId
        const projectId = req.query.projectId; // Placeholder
        const ticketCategory = req.query.category; // Placeholder
        
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }
        
        const assignableUsers = await projectAccessService.getAssignableUsers(
            projectId,
            ticketCategory
        );
        
        res.json({
            success: true,
            data: assignableUsers
        });
    } catch (error) {
        console.error('Error fetching assignable users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignable users'
        });
    }
};

// POST /api/v1/tickets/:ticketId/assign
export const assignTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { 
            assignedTo,
            assignedRole,
            assignedTeam,
            notifyWatchers = true,
            ccContacts = []
        } = req.body;
        
        // In production: 
        // 1. Fetch ticket
        // 2. Update ticket assignment
        // 3. Send notifications
        
        // Placeholder ticket update
        const ticket = {
            id: ticketId,
            ticketNumber: 'TKT-2024-0001',
            title: 'Test Ticket',
            assignedToId: assignedTo,
            assignedRoleId: assignedRole,
            assignedTeamId: assignedTeam,
            ccContactIds: ccContacts,
            projectId: req.body.projectId // From request
        };
        
        // Send notification to assigned user
        if (assignedTo) {
            const access = await UserProjectAccess.findOne({
                where: { 
                    userId: assignedTo,
                    projectId: ticket.projectId
                }
            });
            
            if (access && access.receiveNotifications) {
                await notificationService.sendNotification({
                    userId: assignedTo,
                    projectId: ticket.projectId,
                    type: NOTIFICATION_EVENTS.TICKET_ASSIGNED,
                    title: 'Ticket zugewiesen',
                    body: `Ticket ${ticket.ticketNumber}: ${ticket.title} wurde Ihnen zugewiesen`,
                    ticketId: ticket.id,
                    channels: access.notificationChannels,
                    priority: 'normal'
                });
            }
        }
        
        // Notify watchers if requested
        if (notifyWatchers && ticket.watcherIds?.length) {
            await projectAccessService.notifyRelevantUsers(
                ticketId,
                NOTIFICATION_EVENTS.TICKET_ASSIGNED,
                req.user
            );
        }
        
        res.json({
            success: true,
            data: ticket,
            message: 'Ticket assigned successfully'
        });
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign ticket'
        });
    }
};

// GET /api/v1/tickets/:ticketId/watchers
export const getWatchers = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // In production: Fetch ticket and get watcherIds
        const watcherIds = []; // Placeholder
        
        // Fetch watcher details
        const watchers = await UserProjectAccess.findAll({
            where: { 
                userId: watcherIds // In production: use Op.in
            }
        });
        
        res.json({
            success: true,
            data: watchers
        });
    } catch (error) {
        console.error('Error fetching watchers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch watchers'
        });
    }
};

// POST /api/v1/tickets/:ticketId/watchers
export const addWatcher = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { userId } = req.body;
        
        // In production:
        // 1. Fetch ticket
        // 2. Add userId to watcherIds array
        // 3. Save ticket
        // 4. Send notification to new watcher
        
        res.json({
            success: true,
            message: 'Watcher added successfully'
        });
    } catch (error) {
        console.error('Error adding watcher:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add watcher'
        });
    }
};

// DELETE /api/v1/tickets/:ticketId/watchers/:userId
export const removeWatcher = async (req, res) => {
    try {
        const { ticketId, userId } = req.params;
        
        // In production:
        // 1. Fetch ticket
        // 2. Remove userId from watcherIds array
        // 3. Save ticket
        
        res.json({
            success: true,
            message: 'Watcher removed successfully'
        });
    } catch (error) {
        console.error('Error removing watcher:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove watcher'
        });
    }
};

