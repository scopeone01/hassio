-- ============================================
-- FacilityMaster Complete Database Setup
-- Für direkten Import in phpMyAdmin
-- ============================================

-- Database erstellen (falls noch nicht vorhanden)
CREATE DATABASE IF NOT EXISTS facility_master
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE facility_master;

-- ============================================
-- 1. Alte Tabellen löschen (VORSICHT!)
-- ============================================
DROP TABLE IF EXISTS user_project_access;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- ============================================
-- 2. Users Tabelle
-- ============================================
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Projects Tabelle
-- ============================================
CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_number (project_number),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. User-Project-Access Tabelle
-- ============================================
CREATE TABLE user_project_access (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_project (project_id),
    INDEX idx_access_level (access_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Test-Daten einfügen
-- ============================================

-- Admin User (Passwort: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role_name, is_active)
VALUES (
    'b1ad8383-5ab2-49c6-afc0-39a07566ef2c',
    'admin@facilitymaster.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7LLiWKEWVy',
    'Admin',
    'User',
    'ADMIN',
    TRUE
);

-- Demo Project
INSERT INTO projects (id, name, project_number, address, city, postal_code, country, is_active)
VALUES (
    '69120bde-79c5-4b51-8a8d-66d07f34b8ca',
    'Demo Project',
    'DEMO-001',
    'Demo Street 1',
    'Demo City',
    '12345',
    'Deutschland',
    TRUE
);

-- Admin Zugriff auf Demo Project
INSERT INTO user_project_access (
    user_id,
    project_id,
    access_level,
    user_type,
    can_create_tickets,
    can_edit_tickets,
    can_assign_tickets,
    can_delete_tickets,
    can_approve_workflow,
    can_view_all_tickets,
    receive_notifications,
    granted_by
)
VALUES (
    'b1ad8383-5ab2-49c6-afc0-39a07566ef2c',
    '69120bde-79c5-4b51-8a8d-66d07f34b8ca',
    'ADMIN',
    'admin',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'b1ad8383-5ab2-49c6-afc0-39a07566ef2c'
);

-- ============================================
-- 6. Weitere Demo-User (optional)
-- ============================================

-- Techniker (Passwort: tech123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role_name, is_technician, is_active)
VALUES (
    UUID(),
    'technician@facilitymaster.local',
    '$2b$12$hO8vYPLsKZ.6kqE4FqXxAeWGQw5uYqN8X5L5kF7PqA9ZKpXqJ5LqC',
    'Max',
    'Techniker',
    'USER',
    TRUE,
    TRUE
);

-- Projekt-Manager (Passwort: manager123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role_name, is_technician, is_active)
VALUES (
    UUID(),
    'manager@facilitymaster.local',
    '$2b$12$8.KqE4FqXxAeWGQw5uYqN8X5L5kF7PqA9ZKpXqJ5LqChO8vYPLsKZ',
    'Anna',
    'Manager',
    'USER',
    FALSE,
    TRUE
);

-- ============================================
-- 7. Weitere Demo-Projekte (optional)
-- ============================================

INSERT INTO projects (id, name, project_number, address, city, postal_code, country, is_active)
VALUES
(
    UUID(),
    'Bürogebäude Hauptstraße',
    'PRJ-2025-001',
    'Hauptstraße 100',
    'Berlin',
    '10115',
    'Deutschland',
    TRUE
),
(
    UUID(),
    'Wohnanlage Parkblick',
    'PRJ-2025-002',
    'Parkweg 45',
    'München',
    '80331',
    'Deutschland',
    TRUE
),
(
    UUID(),
    'Industriehalle Nord',
    'PRJ-2025-003',
    'Industriestr. 12',
    'Hamburg',
    '20095',
    'Deutschland',
    TRUE
);

-- ============================================
-- 8. Verifizierung
-- ============================================

-- Zeige alle Benutzer
SELECT
    email,
    first_name,
    last_name,
    role_name,
    is_technician,
    is_active,
    created_at
FROM users;

-- Zeige alle Projekte
SELECT
    name,
    project_number,
    city,
    is_active,
    created_at
FROM projects;

-- Zeige alle Zugriffe
SELECT
    u.email as user_email,
    p.name as project_name,
    upa.access_level,
    upa.user_type,
    upa.granted_at
FROM user_project_access upa
JOIN users u ON upa.user_id = u.id
JOIN projects p ON upa.project_id = p.id;

-- ============================================
-- FERTIG!
-- ============================================
--
-- Login-Daten:
-- Admin:      admin@facilitymaster.local / admin123
-- Techniker:  technician@facilitymaster.local / tech123
-- Manager:    manager@facilitymaster.local / manager123
--
-- ============================================
