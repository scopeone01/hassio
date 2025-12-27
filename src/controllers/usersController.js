import User from '../models/User.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import Project from '../models/Project.js';
import bcrypt from 'bcrypt';

// Get all users (admin only)
export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['passwordHash'] }, // Don't send password hash
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });

    // Enrich with project access information
    const usersWithProjects = await Promise.all(
      users.map(async (user) => {
        const projectAccess = await UserProjectAccess.findAll({
          where: { userId: user.id },
        });
        
        // Get project details separately
        const projectIds = projectAccess.map(pa => pa.projectId);
        const projects = projectIds.length > 0 ? await Project.findAll({
          where: { id: projectIds },
          attributes: ['id', 'name'],
        }) : [];
        
        const projectMap = new Map(projects.map(p => [p.id, p]));

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          roleName: user.roleName,
          isTechnician: user.isTechnician,
          isActive: user.isActive,
          createdBy: user.createdBy,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          projects: projectAccess
            .filter(access => projectMap.has(access.projectId)) // Only include existing projects
            .map(access => ({
              id: access.projectId,
              name: projectMap.get(access.projectId).name,
              accessLevel: access.accessLevel,
              userType: access.userType,
            })),
        };
      })
    );

    res.status(200).json(usersWithProjects);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Users can view their own profile, admins can view any
    if (user.id !== requestingUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get project access
    const projectAccess = await UserProjectAccess.findAll({
      where: { userId: user.id },
    });
    
    // Get project details
    const projectIds = projectAccess.map(pa => pa.projectId);
    const projects = projectIds.length > 0 ? await Project.findAll({
      where: { id: projectIds },
      attributes: ['id', 'name'],
    }) : [];
    
    const projectMap = new Map(projects.map(p => [p.id, p]));

    res.status(200).json({
      ...user.toJSON(),
      projects: projectAccess
        .filter(access => projectMap.has(access.projectId)) // Only include existing projects
        .map(access => ({
          id: access.projectId,
          name: projectMap.get(access.projectId).name,
          accessLevel: access.accessLevel,
          userType: access.userType,
        })),
    });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
};

// Create new user (admin only)
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      roleName,
      isTechnician,
      projectIds, // Array of project IDs to assign user to
      accessLevel, // Default access level for projects
      userType, // Default user type for projects
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'firstName, lastName, email, and password are required',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      phoneNumber: phoneNumber || null,
      roleName: roleName || 'USER',
      isTechnician: isTechnician || false,
      isActive: true,
      createdBy: req.user.id,
    });

    // Assign to projects if provided
    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      const projectAccesses = projectIds.map(projectId => ({
        userId: user.id,
        projectId,
        accessLevel: accessLevel || 'READ',
        userType: userType || 'Contact',
        canCreateTickets: true,
        canEditTickets: false,
        canAssignTickets: false,
        canDeleteTickets: false,
        canViewAllTickets: false,
        canApproveWorkflow: false,
        receiveNotifications: true,
        notificationChannels: ['push'],
        grantedBy: req.user.id,
        grantedAt: new Date(),
      }));

      await UserProjectAccess.bulkCreate(projectAccesses);
    }

    // Return user without password hash
    const userResponse = user.toJSON();
    delete userResponse.passwordHash;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user (admin only, or user can update own profile)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      roleName,
      isTechnician,
      isActive,
    } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Users can update their own profile (except role and isActive), admins can update any
    const isAdmin = req.user.role === 'ADMIN';
    const isOwnProfile = user.id === requestingUserId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = email;
    }
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    // Only admins can change these fields
    if (isAdmin) {
      if (roleName !== undefined) user.roleName = roleName;
      if (isTechnician !== undefined) user.isTechnician = isTechnician;
      if (isActive !== undefined) user.isActive = isActive;
    }

    // Update password if provided
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Return user without password hash
    const userResponse = user.toJSON();
    delete userResponse.passwordHash;

    res.status(200).json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all project access entries
    await UserProjectAccess.destroy({ where: { userId: id } });

    // Delete user
    await user.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Assign user to project
export const assignUserToProject = async (req, res) => {
  try {
    const { id: userId, projectId } = req.params;
    const {
      accessLevel,
      userType,
      canCreateTickets,
      canEditTickets,
      canAssignTickets,
      canDeleteTickets,
      canViewAllTickets,
      canApproveWorkflow,
      receiveNotifications,
      notificationChannels,
      roleId,
    } = req.body;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if access already exists
    let userAccess = await UserProjectAccess.findOne({
      where: { userId, projectId },
    });

    if (userAccess) {
      // Update existing access
      userAccess.accessLevel = accessLevel || userAccess.accessLevel;
      userAccess.userType = userType || userAccess.userType;
      if (canCreateTickets !== undefined) userAccess.canCreateTickets = canCreateTickets;
      if (canEditTickets !== undefined) userAccess.canEditTickets = canEditTickets;
      if (canAssignTickets !== undefined) userAccess.canAssignTickets = canAssignTickets;
      if (canDeleteTickets !== undefined) userAccess.canDeleteTickets = canDeleteTickets;
      if (canViewAllTickets !== undefined) userAccess.canViewAllTickets = canViewAllTickets;
      if (canApproveWorkflow !== undefined) userAccess.canApproveWorkflow = canApproveWorkflow;
      if (receiveNotifications !== undefined) userAccess.receiveNotifications = receiveNotifications;
      if (notificationChannels !== undefined) userAccess.notificationChannels = notificationChannels;
      if (roleId !== undefined) userAccess.roleId = roleId;
      await userAccess.save();
    } else {
      // Create new access
      userAccess = await UserProjectAccess.create({
        userId,
        projectId,
        accessLevel: accessLevel || 'READ',
        userType: userType || 'Contact',
        canCreateTickets: canCreateTickets !== undefined ? canCreateTickets : true,
        canEditTickets: canEditTickets !== undefined ? canEditTickets : true,
        canAssignTickets: canAssignTickets !== undefined ? canAssignTickets : false,
        canDeleteTickets: canDeleteTickets !== undefined ? canDeleteTickets : false,
        canViewAllTickets: canViewAllTickets !== undefined ? canViewAllTickets : false,
        canApproveWorkflow: canApproveWorkflow !== undefined ? canApproveWorkflow : false,
        receiveNotifications: receiveNotifications !== undefined ? receiveNotifications : true,
        notificationChannels: notificationChannels || ['push'],
        roleId: roleId || null,
        grantedBy: req.user.id,
        grantedAt: new Date(),
      });
    }

    res.status(200).json(userAccess);
  } catch (error) {
    console.error('Error assigning user to project:', error);
    res.status(500).json({ error: 'Failed to assign user to project' });
  }
};

// Remove user from project
export const removeUserFromProject = async (req, res) => {
  try {
    const { id: userId, projectId } = req.params;

    const deleted = await UserProjectAccess.destroy({
      where: { userId, projectId },
    });

    if (!deleted) {
      return res.status(404).json({ error: 'User project access not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error removing user from project:', error);
    res.status(500).json({ error: 'Failed to remove user from project' });
  }
};

