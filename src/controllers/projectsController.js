import Project from '../models/Project.js';
import Ticket from '../models/Ticket.js';
import UserProjectAccess from '../models/UserProjectAccess.js';

// Get all projects (for authenticated user, only projects they have access to)
export const getProjects = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const userRole = req.user.role; // From auth middleware

    // Admins see all projects
    let projectsData;
    let userAccess = [];

    if (userRole === 'ADMIN') {
      // Fetch all projects for admins
      projectsData = await Project.findAll();
      
      // Get all user access entries for enrichment
      userAccess = await UserProjectAccess.findAll({
        where: { userId },
      });
    } else {
      // Get all projects the user has access to
      userAccess = await UserProjectAccess.findAll({
        where: { userId },
      });

      // Get all project IDs
      const projectIds = userAccess.map((access) => access.projectId);

      // Fetch projects
      projectsData = await Project.findAll({
        where: { id: projectIds },
      });
    }

    // Extract projects and enrich with ticket counts
    const projects = await Promise.all(
      projectsData.map(async (project) => {
        const access = userAccess.find((a) => a.projectId === project.id);
        
        // For admins without explicit access, grant ADMIN access
        const accessLevel = userRole === 'ADMIN' && !access ? 'ADMIN' : (access?.accessLevel || 'READ');
        const userType = userRole === 'ADMIN' && !access ? 'admin' : (access?.userType || 'guest');

        // Count open tickets for this project
        const openTicketsCount = await Ticket.count({
          where: {
            projectId: project.id,
            status: ['New', 'Open', 'InProgress'],
          },
        });

        return {
          id: project.id,
          name: project.name,
          projectNumber: project.projectNumber,
          address: project.address,
          city: project.city,
          postalCode: project.postalCode,
          country: project.country,
          isActive: project.isActive,
          openTickets: openTicketsCount,
          accessLevel,
          userType,
        };
      })
    );

    // Filter out null values (shouldn't happen anymore, but keep for safety)
    const filteredProjects = projects.filter((p) => p !== null);

    res.status(200).json(filteredProjects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
};

// Get a single project by ID
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has access to this project
    const userAccess = await UserProjectAccess.findOne({
      where: { userId, projectId: id },
    });

    if (!userAccess) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Fetch the project
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Count open tickets
    const openTicketsCount = await Ticket.count({
      where: {
        projectId: project.id,
        status: ['New', 'Open', 'InProgress'],
      },
    });

    res.status(200).json({
      id: project.id,
      name: project.name,
      projectNumber: project.projectNumber,
      address: project.address,
      city: project.city,
      postalCode: project.postalCode,
      country: project.country,
      isActive: project.isActive,
      openTickets: openTicketsCount,
      accessLevel: userAccess.accessLevel,
      userType: userAccess.userType,
    });
  } catch (error) {
    console.error('Error getting project by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve project' });
  }
};

// Create new project (admin only)
export const createProject = async (req, res) => {
  try {
    const {
      name,
      projectNumber,
      address,
      city,
      postalCode,
      country,
      latitude,
      longitude,
      customerId,
      notificationSettings,
    } = req.body;

    // Validation
    if (!name || !projectNumber || !address || !city || !postalCode) {
      return res.status(400).json({
        error: 'name, projectNumber, address, city, and postalCode are required',
      });
    }

    // Check if project number already exists
    const existingProject = await Project.findOne({ where: { projectNumber } });
    if (existingProject) {
      return res.status(409).json({ error: 'Project with this project number already exists' });
    }

    // Create project
    const project = await Project.create({
      name,
      projectNumber,
      address,
      city,
      postalCode,
      country: country || 'Deutschland',
      latitude: latitude || null,
      longitude: longitude || null,
      customerId: customerId || null,
      notificationSettings: notificationSettings || {
        notifyOnNewTicket: true,
        notifyOnAssignment: true,
        notifyOnStatusChange: true,
        notifyOnComment: true,
        notifyOnSlaWarning: true,
        emailDigestFrequency: 'Daily',
      },
      isActive: true,
    });

    // Automatically grant the creator ADMIN access to the project
    const creatorId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    
    await UserProjectAccess.create({
      userId: creatorId,
      projectId: project.id,
      accessLevel: isAdmin ? 'ADMIN' : 'WRITE',
      userType: isAdmin ? 'admin' : 'manager',
      canCreateTickets: true,
      canEditTickets: true,
      canAssignTickets: true,
      canDeleteTickets: true,
      canApproveWorkflow: true,
      canViewAllTickets: true,
      receiveNotifications: true,
      notificationChannels: ['push', 'email'],
      grantedBy: creatorId,
      grantedAt: new Date(),
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Update project (admin only)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      projectNumber,
      address,
      city,
      postalCode,
      country,
      latitude,
      longitude,
      customerId,
      notificationSettings,
      isActive,
    } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update fields
    if (name !== undefined) project.name = name;
    if (projectNumber !== undefined) {
      // Check if project number is already taken by another project
      const existingProject = await Project.findOne({ where: { projectNumber } });
      if (existingProject && existingProject.id !== project.id) {
        return res.status(409).json({ error: 'Project number already in use' });
      }
      project.projectNumber = projectNumber;
    }
    if (address !== undefined) project.address = address;
    if (city !== undefined) project.city = city;
    if (postalCode !== undefined) project.postalCode = postalCode;
    if (country !== undefined) project.country = country;
    if (latitude !== undefined) project.latitude = latitude;
    if (longitude !== undefined) project.longitude = longitude;
    if (customerId !== undefined) project.customerId = customerId;
    if (notificationSettings !== undefined) project.notificationSettings = notificationSettings;
    if (isActive !== undefined) project.isActive = isActive;

    await project.save();

    res.status(200).json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project (admin only)
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete project (cascade will handle related records)
    await project.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Get buildings for a project
export const getProjectBuildings = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId || req.projectId;
    
    // For now, return empty array as buildings are not yet implemented
    // This endpoint exists to prevent 404 errors
    res.status(200).json([]);
  } catch (error) {
    console.error('Error getting project buildings:', error);
    res.status(500).json({ error: 'Failed to retrieve buildings' });
  }
};

