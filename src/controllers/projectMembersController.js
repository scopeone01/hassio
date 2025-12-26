// Import associations first to ensure they're registered
import '../models/associations.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import ProjectRole from '../models/ProjectRole.js';
import { Op } from 'sequelize';

// GET /api/v1/projects/:projectId/members
export const getMembers = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userType } = req.query;
        
        const where = { projectId };
        if (userType) {
            where.userType = userType;
        }
        
        const members = await UserProjectAccess.findAll({
            where,
            include: [
                {
                    model: ProjectRole,
                    as: 'role',
                    required: false
                }
            ]
        });
        
        res.json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch members'
        });
    }
};

// POST /api/v1/projects/:projectId/members
export const addMember = async (req, res) => {
    try {
        const { projectId } = req.params;
        const memberData = {
            projectId,
            grantedAt: new Date(),
            grantedBy: req.user.id,
            ...req.body
        };
        
        const member = await UserProjectAccess.create(memberData);
        
        res.status(201).json({
            success: true,
            data: member
        });
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add member'
        });
    }
};

// PUT /api/v1/projects/:projectId/members/:userId
export const updateMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        
        const member = await UserProjectAccess.findOne({
            where: { projectId, userId }
        });
        
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }
        
        await member.update(req.body);
        
        res.json({
            success: true,
            data: member
        });
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update member'
        });
    }
};

// DELETE /api/v1/projects/:projectId/members/:userId
export const removeMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        
        const member = await UserProjectAccess.findOne({
            where: { projectId, userId }
        });
        
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }
        
        await member.destroy();
        
        res.json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove member'
        });
    }
};

// GET /api/v1/projects/:projectId/members/technicians
export const getTechnicians = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const technicians = await UserProjectAccess.findAll({
            where: { 
                projectId,
                userType: 'technician'
            },
            include: [
                {
                    model: ProjectRole,
                    as: 'role',
                    required: false
                }
            ]
        });
        
        res.json({
            success: true,
            data: technicians
        });
    } catch (error) {
        console.error('Error fetching technicians:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch technicians'
        });
    }
};

// GET /api/v1/projects/:projectId/members/contacts
export const getContacts = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const contacts = await UserProjectAccess.findAll({
            where: { 
                projectId,
                userType: 'contact'
            }
        });
        
        res.json({
            success: true,
            data: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts'
        });
    }
};

// GET /api/v1/projects/:projectId/members/managers
export const getManagers = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const managers = await UserProjectAccess.findAll({
            where: { 
                projectId,
                userType: 'manager'
            }
        });
        
        res.json({
            success: true,
            data: managers
        });
    } catch (error) {
        console.error('Error fetching managers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch managers'
        });
    }
};

// GET /api/v1/projects/:projectId/members/:userId/availability
export const getUserAvailability = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        
        const member = await UserProjectAccess.findOne({
            where: { projectId, userId },
            include: [
                {
                    model: ProjectRole,
                    as: 'role',
                    required: false
                }
            ]
        });
        
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }
        
        // In production, fetch actual ticket counts and working hours
        const currentTickets = 0; // Placeholder
        const maxTickets = member.role?.maxConcurrentTickets || 10;
        const workload = currentTickets / maxTickets;
        
        const availability = {
            userId: member.userId,
            userType: member.userType,
            role: member.role,
            currentTickets,
            maxTickets,
            workload,
            isAvailable: workload < 0.9,
            status: getAvailabilityStatus(workload)
        };
        
        res.json({
            success: true,
            data: availability
        });
    } catch (error) {
        console.error('Error fetching user availability:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user availability'
        });
    }
};

// GET /api/v1/projects/:projectId/members/available
export const getAvailableMembers = async (req, res) => {
    try {
        // Support both :id and :projectId parameter names
        const projectId = req.params.projectId || req.params.id || req.projectId;
        const { category } = req.query;
        
        const members = await UserProjectAccess.findAll({
            where: { 
                projectId,
                userType: 'technician',
                canEditTickets: true
            },
            include: [
                {
                    model: ProjectRole,
                    as: 'role',
                    required: false
                }
            ]
        });
        
        // In production, fetch ticket counts and filter by availability
        const availableMembers = members.map(member => ({
            ...member.toJSON(),
            currentTickets: 0,
            maxTickets: member.role?.maxConcurrentTickets || 10,
            isAvailable: true,
            status: 'available'
        }));
        
        // Return array directly for consistency with other endpoints
        res.json(availableMembers);
    } catch (error) {
        console.error('Error fetching available members:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available members'
        });
    }
};

// GET /api/v1/projects/:projectId/members/:userId/permissions
export const getUserPermissions = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        
        const member = await UserProjectAccess.findOne({
            where: { projectId, userId }
        });
        
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }
        
        const permissions = {
            accessLevel: member.accessLevel,
            userType: member.userType,
            canCreateTickets: member.canCreateTickets,
            canEditTickets: member.canEditTickets,
            canAssignTickets: member.canAssignTickets,
            canDeleteTickets: member.canDeleteTickets,
            canApproveWorkflow: member.canApproveWorkflow,
            canViewAllTickets: member.canViewAllTickets,
            receiveNotifications: member.receiveNotifications,
            notificationChannels: member.notificationChannels
        };
        
        res.json({
            success: true,
            data: permissions
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user permissions'
        });
    }
};

// Helper function
function getAvailabilityStatus(workload) {
    if (workload >= 0.9) return 'unavailable';
    if (workload >= 0.7) return 'limited';
    if (workload >= 0.5) return 'busy';
    return 'available';
}

