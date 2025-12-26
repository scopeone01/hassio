-- Enhanced Multi-Tenancy with Roles System (MariaDB/MySQL)
-- Migration 001: Project Roles, Enhanced User Access, Enhanced Tickets

-- ==========================================
-- 1. CREATE project_roles TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS project_roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007AFF',
    icon VARCHAR(100) DEFAULT 'person.fill',
    permissions JSON DEFAULT ('{}'),
    specialization JSON DEFAULT ('[]'),
    skill_level VARCHAR(50) DEFAULT 'Mid-Level',
    working_hours JSON,
    max_concurrent_tickets INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for project_roles
CREATE INDEX idx_project_roles_project ON project_roles(project_id);
CREATE INDEX idx_project_roles_active ON project_roles(is_active);
CREATE INDEX idx_project_roles_project_active ON project_roles(project_id, is_active);

-- ==========================================
-- 2. EXTEND user_project_access TABLE
-- ==========================================

-- Add columns one by one (MariaDB doesn't support ADD COLUMN IF NOT EXISTS in all versions)
-- These will fail silently if columns already exist

ALTER TABLE user_project_access ADD COLUMN role_id CHAR(36);
ALTER TABLE user_project_access ADD COLUMN user_type VARCHAR(50) DEFAULT 'guest';
ALTER TABLE user_project_access ADD COLUMN can_create_tickets BOOLEAN DEFAULT TRUE;
ALTER TABLE user_project_access ADD COLUMN can_edit_tickets BOOLEAN DEFAULT TRUE;
ALTER TABLE user_project_access ADD COLUMN can_assign_tickets BOOLEAN DEFAULT FALSE;
ALTER TABLE user_project_access ADD COLUMN can_delete_tickets BOOLEAN DEFAULT FALSE;
ALTER TABLE user_project_access ADD COLUMN can_approve_workflow BOOLEAN DEFAULT FALSE;
ALTER TABLE user_project_access ADD COLUMN can_view_all_tickets BOOLEAN DEFAULT FALSE;
ALTER TABLE user_project_access ADD COLUMN receive_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE user_project_access ADD COLUMN notification_channels JSON DEFAULT ('["push"]');

-- Foreign key for role_id (run separately, may fail if already exists)
-- ALTER TABLE user_project_access ADD CONSTRAINT fk_upa_role FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE SET NULL;

-- Indexes for user_project_access
CREATE INDEX idx_user_project_access_type ON user_project_access(project_id, user_type);
CREATE INDEX idx_user_project_access_role ON user_project_access(project_id, role_id);
CREATE INDEX idx_user_project_access_user_type ON user_project_access(user_id, user_type);

-- ==========================================
-- 3. EXTEND tickets TABLE
-- ==========================================

ALTER TABLE tickets ADD COLUMN created_by_type VARCHAR(50);
ALTER TABLE tickets ADD COLUMN assigned_to_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN assigned_to_type VARCHAR(50);
ALTER TABLE tickets ADD COLUMN assigned_role_id CHAR(36);
ALTER TABLE tickets ADD COLUMN assigned_team_id CHAR(36);
ALTER TABLE tickets ADD COLUMN watcher_ids JSON DEFAULT ('[]');
ALTER TABLE tickets ADD COLUMN cc_contact_ids JSON DEFAULT ('[]');

-- Foreign key for assigned_role_id
-- ALTER TABLE tickets ADD CONSTRAINT fk_tickets_role FOREIGN KEY (assigned_role_id) REFERENCES project_roles(id) ON DELETE SET NULL;

-- Indexes for tickets
CREATE INDEX idx_tickets_assigned_type ON tickets(assigned_to_type);
CREATE INDEX idx_tickets_assigned_role ON tickets(assigned_role_id);
CREATE INDEX idx_tickets_created_by_type ON tickets(created_by_type);
CREATE INDEX idx_tickets_project_status ON tickets(project_id, status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to_id);

-- ==========================================
-- 4. EXTEND projects TABLE
-- ==========================================

ALTER TABLE projects ADD COLUMN notification_settings JSON DEFAULT ('{
    "notifyOnNewTicket": true,
    "notifyOnAssignment": true,
    "notifyOnStatusChange": true,
    "notifyOnComment": true,
    "notifyOnSlaWarning": true,
    "emailDigestFrequency": "none"
}');

-- ==========================================
-- 5. CREATE notifications TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    project_id CHAR(36),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSON,
    channels JSON DEFAULT ('["push"]'),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ticket_id CHAR(36),
    asset_id CHAR(36),
    task_id CHAR(36),
    priority VARCHAR(50) DEFAULT 'normal',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_project ON notifications(project_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_ticket ON notifications(ticket_id);

-- ==========================================
-- 6. CREATE notification_rules TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS notification_rules (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_types JSON NOT NULL,
    conditions JSON,
    recipient_type VARCHAR(100) NOT NULL,
    role_id CHAR(36),
    notify_actor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for notification_rules
CREATE INDEX idx_notification_rules_project ON notification_rules(project_id, is_active);
CREATE INDEX idx_notification_rules_type ON notification_rules(recipient_type);

-- ==========================================
-- 7. CREATE audit_log TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    project_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    changes JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for audit_log
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ==========================================
-- 8. TRIGGERS (MariaDB syntax)
-- ==========================================

-- Note: updated_at is handled by ON UPDATE CURRENT_TIMESTAMP in column definition
-- No additional triggers needed for MariaDB

-- ==========================================
-- 9. DEFAULT DATA
-- ==========================================

-- Insert default roles for existing projects (if any)
INSERT INTO project_roles (id, project_id, name, description, color, icon, permissions, specialization, skill_level, max_concurrent_tickets)
SELECT 
    UUID() as id,
    p.id as project_id,
    'Techniker' as name,
    'Standard Techniker-Rolle' as description,
    '#007AFF' as color,
    'wrench.and.screwdriver' as icon,
    JSON_OBJECT(
        'canCreateTickets', true,
        'canEditTickets', true,
        'canAssignTickets', false,
        'canDeleteTickets', false,
        'canViewAllTickets', false,
        'canApproveWorkflows', false,
        'canManageTemplates', false,
        'canExportData', false,
        'canManageUsers', false
    ) as permissions,
    JSON_ARRAY() as specialization,
    'Mid-Level' as skill_level,
    10 as max_concurrent_tickets
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM project_roles pr WHERE pr.project_id = p.id
);

-- Insert default notification rules
INSERT INTO notification_rules (id, project_id, name, description, event_types, recipient_type, is_active)
SELECT 
    UUID() as id,
    p.id as project_id,
    'Ticket-Zuweisung' as name,
    'Benachrichtige zugewiesenen User bei Ticket-Zuweisung' as description,
    JSON_ARRAY('ticket:assigned') as event_types,
    'assigned_user' as recipient_type,
    true as is_active
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM notification_rules nr 
    WHERE nr.project_id = p.id 
    AND nr.name = 'Ticket-Zuweisung'
);

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
