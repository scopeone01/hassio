import UserProjectAccess from '../models/UserProjectAccess.js';
import ProjectRole from '../models/ProjectRole.js';
import Notification from '../models/Notification.js';
import { Op } from 'sequelize';

class ProjectAccessService {
    // Prüft ob User Zugriff auf Projekt hat
    async checkAccess(userId, projectId, requiredPermission) {
        const access = await UserProjectAccess.findOne({
            where: { userId, projectId }
        });
        
        if (!access) return false;
        
        // Admin hat immer Zugriff
        if (access.accessLevel === 'ADMIN') return true;
        
        // Prüfe spezifische Permission
        const permissionMap = {
            createTickets: access.canCreateTickets,
            editTickets: access.canEditTickets,
            assignTickets: access.canAssignTickets,
            deleteTickets: access.canDeleteTickets,
            approveWorkflow: access.canApproveWorkflow,
            viewAllTickets: access.canViewAllTickets
        };
        
        return permissionMap[requiredPermission] === true;
    }
    
    // Holt zuweisbare Techniker für Ticket
    async getAssignableUsers(projectId, ticketCategory = null) {
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
        
        // In production: Filtere nach Spezialisierung, max_concurrent_tickets, etc.
        const assignableUsers = members.map(member => {
            const currentTickets = 0; // Placeholder - fetch from Ticket model
            const maxTickets = member.role?.maxConcurrentTickets || 10;
            const workload = currentTickets / maxTickets;
            
            return {
                id: member.userId,
                projectAccessId: member.id,
                userType: member.userType,
                role: member.role ? {
                    id: member.role.id,
                    name: member.role.name,
                    color: member.role.color,
                    icon: member.role.icon,
                    specialization: member.role.specialization,
                    skillLevel: member.role.skillLevel
                } : null,
                currentTickets,
                maxTickets,
                workload,
                available: workload < 0.9,
                availabilityStatus: this.getAvailabilityStatus(workload)
            };
        });
        
        // Sortiere nach Verfügbarkeit
        return assignableUsers.sort((a, b) => a.workload - b.workload);
    }
    
    // Benachrichtigt relevante User
    async notifyRelevantUsers(ticketId, eventType, actor) {
        try {
            // In production: Fetch ticket with full data
            const ticket = { id: ticketId }; // Placeholder
            
            // Hole alle User die benachrichtigt werden sollen
            const usersToNotify = await this.getUsersToNotify(
                ticket.projectId,
                eventType,
                ticket
            );
            
            // Sende Notifications
            for (const user of usersToNotify) {
                const notification = await Notification.create({
                    userId: user.userId,
                    projectId: ticket.projectId,
                    type: eventType,
                    title: this.getNotificationTitle(eventType, ticket),
                    body: this.getNotificationBody(eventType, ticket, actor),
                    ticketId: ticket.id,
                    channels: user.notificationChannels || ['push'],
                    sentAt: new Date()
                });
                
                // In production: Send actual notifications via Firebase, Email, etc.
                console.log(`Notification sent to user ${user.userId}:`, notification.title);
            }
        } catch (error) {
            console.error('Error notifying users:', error);
        }
    }
    
    async getUsersToNotify(projectId, eventType, ticket) {
        const users = [];
        
        // 1. Zugewiesener User
        if (ticket.assignedToId) {
            const assignedUser = await UserProjectAccess.findOne({
                where: { 
                    projectId,
                    userId: ticket.assignedToId,
                    receiveNotifications: true
                }
            });
            if (assignedUser) {
                users.push(assignedUser);
            }
        }
        
        // 2. Watchers
        if (ticket.watcherIds?.length) {
            const watchers = await UserProjectAccess.findAll({
                where: { 
                    projectId,
                    userId: { [Op.in]: ticket.watcherIds },
                    receiveNotifications: true
                }
            });
            users.push(...watchers);
        }
        
        // 3. Projekt-Admins (für bestimmte Events)
        if (['sla_warning', 'escalation', 'ticket_escalated'].includes(eventType)) {
            const admins = await UserProjectAccess.findAll({
                where: { 
                    projectId,
                    accessLevel: 'ADMIN',
                    receiveNotifications: true
                }
            });
            users.push(...admins);
        }
        
        // 4. CC Kontakte
        if (ticket.ccContactIds?.length) {
            const contacts = await UserProjectAccess.findAll({
                where: { 
                    projectId,
                    userId: { [Op.in]: ticket.ccContactIds },
                    receiveNotifications: true
                }
            });
            users.push(...contacts);
        }
        
        // Duplikate entfernen
        const uniqueUsers = [];
        const seenIds = new Set();
        
        for (const user of users) {
            if (!seenIds.has(user.userId)) {
                seenIds.add(user.userId);
                uniqueUsers.push(user);
            }
        }
        
        return uniqueUsers;
    }
    
    getAvailabilityStatus(workload) {
        if (workload >= 0.9) return 'unavailable';
        if (workload >= 0.7) return 'limited';
        if (workload >= 0.5) return 'busy';
        return 'available';
    }
    
    getNotificationTitle(eventType, ticket) {
        const titles = {
            'ticket:created': 'Neues Ticket erstellt',
            'ticket:assigned': 'Ticket zugewiesen',
            'ticket:status_changed': 'Ticket-Status geändert',
            'ticket:priority_changed': 'Ticket-Priorität geändert',
            'comment:added': 'Neuer Kommentar',
            'sla:warning': 'SLA-Warnung',
            'ticket:escalated': 'Ticket eskaliert'
        };
        return titles[eventType] || 'Ticket-Update';
    }
    
    getNotificationBody(eventType, ticket, actor) {
        const bodies = {
            'ticket:created': `Ticket ${ticket.ticketNumber || ticket.id}: ${ticket.title || 'Neues Ticket'}`,
            'ticket:assigned': `Ticket ${ticket.ticketNumber || ticket.id} wurde Ihnen zugewiesen`,
            'ticket:status_changed': `Status von Ticket ${ticket.ticketNumber || ticket.id} wurde geändert`,
            'comment:added': `${actor?.name || 'Jemand'} hat einen Kommentar hinzugefügt`
        };
        return bodies[eventType] || `Update für Ticket ${ticket.ticketNumber || ticket.id}`;
    }
}

export default new ProjectAccessService();








