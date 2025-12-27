import UserProjectAccess from '../models/UserProjectAccess.js';

/**
 * Middleware to check if user has admin privileges
 * Checks both global admin role and project-specific admin access
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has global admin role
    // This would typically come from the User model's roleName field
    // For now, we check the JWT token's role field
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check project-specific admin access if projectId is in params or body
    const projectId = req.params.projectId || req.body.projectId;
    
    if (projectId) {
      const projectAccess = await UserProjectAccess.findOne({
        where: {
          userId,
          projectId,
          accessLevel: 'ADMIN'
        }
      });

      if (projectAccess) {
        return next();
      }
    }

    // No admin access found
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error checking admin privileges'
    });
  }
};

/**
 * Middleware to check if user can manage users
 * Admins can always manage users, others need specific permission
 */
export const canManageUsers = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Global admins can always manage users
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // For project-specific user management, check project admin access
    const projectId = req.params.projectId || req.body.projectId;
    
    if (projectId) {
      const projectAccess = await UserProjectAccess.findOne({
        where: {
          userId,
          projectId,
          accessLevel: 'ADMIN'
        }
      });

      if (projectAccess) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions to manage users'
    });
  } catch (error) {
    console.error('Can manage users middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error checking user management permissions'
    });
  }
};

/**
 * Middleware to check if user can manage projects
 * Only global admins can manage projects
 */
export const canManageProjects = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Only global admins can manage projects
    if (req.user.role === 'ADMIN') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Only global administrators can manage projects'
    });
  } catch (error) {
    console.error('Can manage projects middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error checking project management permissions'
    });
  }
};








