-- Base Tables for FacilityMaster
-- Migration 000: Users, Projects, Tickets, User-Project-Access

-- ==========================================
-- 1. USERS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role_name VARCHAR(50) DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_name);
CREATE INDEX idx_users_active ON users(is_active);

-- ==========================================
-- 2. PROJECTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS projects (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    project_number VARCHAR(100),
    description TEXT,
    address VARCHAR(500),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Deutschland',
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_by_id CHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_active ON projects(is_active);

-- ==========================================
-- 3. USER_PROJECT_ACCESS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS user_project_access (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    access_level VARCHAR(50) DEFAULT 'member',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_project (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_upa_user ON user_project_access(user_id);
CREATE INDEX idx_upa_project ON user_project_access(project_id);

-- ==========================================
-- 4. TICKETS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS tickets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    ticket_number VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(50) DEFAULT 'normal',
    category VARCHAR(100),
    created_by_id CHAR(36),
    assigned_to_id CHAR(36),
    due_date TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_tickets_project ON tickets(project_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by_id);

-- ==========================================
-- 5. INSERT DEFAULT ADMIN USER
-- ==========================================

-- Password: admin123 (bcrypt hash)
INSERT INTO users (id, email, password_hash, first_name, last_name, role_name, is_active)
SELECT UUID(), 'admin@facilitymaster.de', '$2b$10$rQZ5hYMIJMQbKmWZVxLZOeQZvZhHh5H5H5H5H5H5H5H5H5H5H5H5O', 'Admin', 'User', 'ADMIN', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@facilitymaster.de');

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

