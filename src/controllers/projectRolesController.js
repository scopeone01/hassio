import ProjectRole from '../models/ProjectRole.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import { Op } from 'sequelize';

// GET /api/v1/projects/:projectId/roles
export const getRoles = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { active } = req.query;
        
        const where = { projectId };
        if (active !== undefined) {
            where.isActive = active === 'true';
        }
        
        const roles = await ProjectRole.findAll({
            where,
            order: [['name', 'ASC']]
        });
        
        // Add member count for each role
        const rolesWithCounts = await Promise.all(
            roles.map(async (role) => {
                const memberCount = await UserProjectAccess.count({
                    where: { roleId: role.id }
                });
                return {
                    ...role.toJSON(),
                    memberCount
                };
            })
        );
        
        res.json({
            success: true,
            data: rolesWithCounts
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch roles'
        });
    }
};

// POST /api/v1/projects/:projectId/roles
export const createRole = async (req, res) => {
    try {
        const { projectId } = req.params;
        const roleData = {
            projectId,
            ...req.body
        };
        
        const role = await ProjectRole.create(roleData);
        
        res.status(201).json({
            success: true,
            data: role
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create role'
        });
    }
};

// GET /api/v1/projects/:projectId/roles/:roleId
export const getRoleById = async (req, res) => {
    try {
        const { roleId } = req.params;
        
        const role = await ProjectRole.findByPk(roleId);
        
        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found'
            });
        }
        
        // Get member count
        const memberCount = await UserProjectAccess.count({
            where: { roleId: role.id }
        });
        
        res.json({
            success: true,
            data: {
                ...role.toJSON(),
                memberCount
            }
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch role'
        });
    }
};

// PUT /api/v1/projects/:projectId/roles/:roleId
export const updateRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        
        const role = await ProjectRole.findByPk(roleId);
        
        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found'
            });
        }
        
        await role.update(req.body);
        
        res.json({
            success: true,
            data: role
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update role'
        });
    }
};

// DELETE /api/v1/projects/:projectId/roles/:roleId
export const deleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        
        const role = await ProjectRole.findByPk(roleId);
        
        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found'
            });
        }
        
        // Check if role has members
        const memberCount = await UserProjectAccess.count({
            where: { roleId: role.id }
        });
        
        if (memberCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete role with assigned members'
            });
        }
        
        await role.destroy();
        
        res.json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete role'
        });
    }
};

// GET /api/v1/projects/:projectId/roles/:roleId/members
export const getRoleMembers = async (req, res) => {
    try {
        const { roleId } = req.params;
        
        const members = await UserProjectAccess.findAll({
            where: { roleId },
            // In production, include User model for details
            // include: [{ model: User, as: 'user' }]
        });
        
        res.json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching role members:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch role members'
        });
    }
};

// POST /api/v1/projects/:projectId/roles/:roleId/members
export const addRoleMember = async (req, res) => {
    try {
        const { projectId, roleId } = req.params;
        const { userId } = req.body;
        
        // Check if access already exists
        const existingAccess = await UserProjectAccess.findOne({
            where: { userId, projectId }
        });
        
        if (existingAccess) {
            // Update existing access
            await existingAccess.update({ roleId });
            
            return res.json({
                success: true,
                data: existingAccess
            });
        }
        
        // Create new access
        const access = await UserProjectAccess.create({
            userId,
            projectId,
            roleId,
            accessLevel: 'WRITE',
            userType: 'technician',
            grantedAt: new Date(),
            grantedBy: req.user.id
        });
        
        res.status(201).json({
            success: true,
            data: access
        });
    } catch (error) {
        console.error('Error adding role member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add role member'
        });
    }
};

// DELETE /api/v1/projects/:projectId/roles/:roleId/members/:userId
export const removeRoleMember = async (req, res) => {
    try {
        const { projectId, roleId, userId } = req.params;
        
        const access = await UserProjectAccess.findOne({
            where: { userId, projectId, roleId }
        });
        
        if (!access) {
            return res.status(404).json({
                success: false,
                error: 'Role member not found'
            });
        }
        
        // Remove role but keep project access
        await access.update({ roleId: null });
        
        res.json({
            success: true,
            message: 'Role member removed successfully'
        });
    } catch (error) {
        console.error('Error removing role member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove role member'
        });
    }
};








