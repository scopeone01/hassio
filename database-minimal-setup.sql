-- ============================================
-- FacilityMaster MINIMAL Setup (nur Admin & Demo Project)
-- ============================================

USE facility_master;

-- 1. Alte Tabellen löschen
DROP TABLE IF EXISTS user_project_access;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- 2. Users Tabelle
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255),
    role_name VARCHAR(50) DEFAULT 'USER',
    is_technician BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by CHAR(36),
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Projects Tabelle
CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_number VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    postal_code VARCHAR(255) NOT NULL,
    country VARCHAR(255) DEFAULT 'Deutschland',
    is_active BOOLEAN DEFAULT TRUE,
    latitude DOUBLE,
    longitude DOUBLE,
    customer_id CHAR(36),
    notification_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User-Project-Access Tabelle
CREATE TABLE user_project_access (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    role_id CHAR(36),
    access_level VARCHAR(50) DEFAULT 'READ',
    user_type VARCHAR(50) DEFAULT 'MEMBER',
    can_create_tickets BOOLEAN DEFAULT TRUE,
    can_edit_tickets BOOLEAN DEFAULT TRUE,
    can_assign_tickets BOOLEAN DEFAULT FALSE,
    can_delete_tickets BOOLEAN DEFAULT FALSE,
    can_approve_workflow BOOLEAN DEFAULT FALSE,
    can_view_all_tickets BOOLEAN DEFAULT TRUE,
    receive_notifications BOOLEAN DEFAULT TRUE,
    notification_channels JSON,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_project (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Admin User einfügen (Passwort: admin123)
INSERT INTO users
VALUES (
    'b1ad8383-5ab2-49c6-afc0-39a07566ef2c',
    'admin@facilitymaster.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7LLiWKEWVy',
    'Admin',
    'User',
    NULL,
    'ADMIN',
    FALSE,
    TRUE,
    NULL,
    NULL,
    NOW(),
    NOW()
);

-- 6. Demo Project einfügen
INSERT INTO projects
VALUES (
    '69120bde-79c5-4b51-8a8d-66d07f34b8ca',
    'Demo Project',
    'DEMO-001',
    'Demo Street 1',
    'Demo City',
    '12345',
    'Deutschland',
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
);

-- 7. Admin Zugriff auf Demo Project
INSERT INTO user_project_access
VALUES (
    UUID(),
    'b1ad8383-5ab2-49c6-afc0-39a07566ef2c',
    '69120bde-79c5-4b51-8a8d-66d07f34b8ca',
    NULL,
    'ADMIN',
    'admin',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    NULL,
    NOW(),
    'b1ad8383-5ab2-49c6-afc0-39a07566ef2c',
    NOW(),
    NOW()
);

-- Fertig!
SELECT 'Setup abgeschlossen! Login: admin@facilitymaster.local / admin123' as Status;
