import UserProjectAccess from '../models/UserProjectAccess.js';
import Project from '../models/Project.js';
import sequelize from '../config/database.js';

// Check if user has access to project with specific permission
export const checkProjectAccess = (requiredPermission) => {
    return async (req, res, next) => {
        // Support both :id and :projectId parameter names
        const projectId = req.params.projectId || req.params.id;
        const userId = req.user.id;
        
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }
        
        try {
            // Check if project exists first
            console.log('Middleware: Looking for project with ID:', projectId, 'Type:', typeof projectId);
            
            // Use findOne with explicit where clause instead of findByPk
            // This works better with UUIDs in some Sequelize configurations
            let project = await Project.findOne({
                where: { id: projectId }
            });
            
            // If not found, try with raw query to see if it exists in DB
            if (!project) {
                console.log('Middleware: Project not found with findOne, trying raw query...');
                const rawResults = await sequelize.query(
                    'SELECT id, name FROM projects WHERE id = :projectId',
                    {
                        replacements: { projectId },
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                console.log('Middleware: Raw query result:', rawResults);
                console.log('Middleware: Raw query result type:', typeof rawResults);
                console.log('Middleware: Raw query result is array:', Array.isArray(rawResults));
                
                // Also check all projects to see what's in the database
                const allProjects = await sequelize.query(
                    'SELECT id, name FROM projects LIMIT 5',
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                console.log('Middleware: Sample projects in DB:', allProjects);
                
                // If raw query finds it, try to reload the model
                if (rawResults && Array.isArray(rawResults) && rawResults.length > 0) {
                    console.log('Middleware: Project exists in DB but Sequelize can\'t find it. Trying alternative query...');
                    // Try with string comparison
                    project = await Project.findOne({
                        where: sequelize.where(
                            sequelize.cast(sequelize.col('Project.id'), 'TEXT'),
                            projectId
                        )
                    });
                }
            }
            
            console.log('Middleware: Project found:', project ? 'Yes' : 'No', project ? project.name : 'N/A');
            if (!project) {
                console.error('Middleware: Project not found after all attempts:', projectId);
                
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }
            
            // Admin users have access to everything
            if (req.user.role === 'ADMIN') {
                req.project = project; // Attach project for later use
                return next();
            }
            
            // Get user's project access
            const access = await UserProjectAccess.findOne({
                where: { userId, projectId }
            });
            
            if (!access) {
                return res.status(403).json({
                    success: false,
                    error: 'No access to this project'
                });
            }
            
            // Check permission
            if (!hasPermission(access, requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    error: `Insufficient permissions: ${requiredPermission} required`
                });
            }
            
            // Attach access and project to request for later use
            req.projectAccess = access;
            req.project = project;
            req.projectId = projectId;
            // Also set projectId in params if it was passed as 'id'
            if (req.params.id && !req.params.projectId) {
                req.params.projectId = projectId;
            }
            
            next();
        } catch (error) {
            console.error('Error checking project access:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify project access'
            });
        }
    };
};

// Helper function to check specific permissions
function hasPermission(access, permission) {
    // Admin access level has all permissions
    if (access.accessLevel === 'ADMIN') {
        return true;
    }
    
    // Map permission names to access fields
    const permissionMap = {
        read: true, // Everyone with any access can read
        write: access.accessLevel === 'WRITE' || access.accessLevel === 'ADMIN',
        admin: access.accessLevel === 'ADMIN',
        createTickets: access.canCreateTickets,
        editTickets: access.canEditTickets,
        assignTickets: access.canAssignTickets,
        deleteTickets: access.canDeleteTickets,
        approveWorkflow: access.canApproveWorkflow,
        viewAllTickets: access.canViewAllTickets
    };
    
    return permissionMap[permission] !== undefined ? permissionMap[permission] : false;
}

// Middleware to check specific permission
export const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.projectAccess) {
            return res.status(403).json({
                success: false,
                error: 'Project access not verified'
            });
        }
        
        if (!hasPermission(req.projectAccess, permission)) {
            return res.status(403).json({
                success: false,
                error: `Permission denied: ${permission} required`
            });
        }
        
        next();
    };
};

// Get all projects accessible to user
export const getUserProjects = async (userId, userRole) => {
    try {
        // Admins see all projects
        if (userRole === 'ADMIN') {
            // In production, fetch from Project model
            return { all: true };
        }
        
        // Get user's project access
        const accessList = await UserProjectAccess.findAll({
            where: { userId }
        });
        
        return accessList.map(access => ({
            projectId: access.projectId,
            accessLevel: access.accessLevel,
            userType: access.userType,
            permissions: {
                canCreateTickets: access.canCreateTickets,
                canEditTickets: access.canEditTickets,
                canAssignTickets: access.canAssignTickets,
                canDeleteTickets: access.canDeleteTickets,
                canApproveWorkflow: access.canApproveWorkflow,
                canViewAllTickets: access.canViewAllTickets
            }
        }));
    } catch (error) {
        console.error('Error getting user projects:', error);
        return [];
    }
};

export default {
    checkProjectAccess,
    requirePermission,
    getUserProjects
};

