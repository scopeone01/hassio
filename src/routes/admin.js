import { Router } from 'express';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * POST /admin/migrate
 * Run database migrations (sync models)
 */
router.post('/migrate', async (req, res) => {
    try {
        console.log('🔄 Running database migrations...');

        // Create tables using raw SQL - MariaDB compatible
        // Don't use sequelize.sync() - it causes issues with JSON defaults
        try {
            // Drop existing tables to ensure clean migration
            console.log('🗑️ Dropping existing tables...');
            await sequelize.query(`SET FOREIGN_KEY_CHECKS = 0`);
            await sequelize.query(`DROP TABLE IF EXISTS user_project_access`);
            await sequelize.query(`DROP TABLE IF EXISTS projects`);
            await sequelize.query(`DROP TABLE IF EXISTS users`);
            await sequelize.query(`SET FOREIGN_KEY_CHECKS = 1`);
            console.log('✅ Old tables dropped');

            // Create users table
            await sequelize.query(`
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
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Users table created');

            // Create projects table
            await sequelize.query(`
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
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Projects table created');

            // Create user_project_access table
            await sequelize.query(`
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
                    granted_by_id CHAR(36),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_project (user_id, project_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ User-Project-Access table created');

        } catch (e) {
            console.warn('⚠️ Table creation warning:', e.message);
        }

        // Verify connection works
        await sequelize.authenticate();
        console.log('✅ Database connection verified');
        console.log('✅ All tables created with correct schema');

        res.json({
            success: true,
            message: 'Database migrations completed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            message: error.message
        });
    }
});

/**
 * POST /admin/seed
 * Seed the database with initial data
 */
router.post('/seed', async (req, res) => {
    try {
        console.log('🌱 Running database seeding...');
        
        // Check if admin user already exists
        const existingAdmin = await User.findOne({
            where: { email: 'admin@facilitymaster.local' }
        });
        
        if (existingAdmin) {
            console.log('ℹ️ Admin user already exists, skipping seed');
            return res.json({
                success: true,
                message: 'Database already seeded',
                data: {
                    adminExists: true,
                    skipped: true
                }
            });
        }
        
        // Create default admin user
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const adminUser = await User.create({
            email: 'admin@facilitymaster.local',
            passwordHash: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            roleName: 'ADMIN',
            isActive: true
        });
        
        console.log('✅ Created admin user:', adminUser.email);
        
        // Create demo project
        const demoProject = await Project.create({
            name: 'Demo Project',
            projectNumber: 'DEMO-001',
            address: 'Demo Street 1',
            city: 'Demo City',
            postalCode: '12345',
            country: 'Deutschland'
        });
        
        console.log('✅ Created demo project:', demoProject.name);
        
        res.json({
            success: true,
            message: 'Database seeded successfully',
            data: {
                adminUser: {
                    email: adminUser.email,
                    defaultPassword: 'admin123'
                },
                project: {
                    name: demoProject.name
                }
            }
        });
    } catch (error) {
        console.error('❌ Seeding error:', error);
        res.status(500).json({
            success: false,
            error: 'Seeding failed',
            message: error.message
        });
    }
});

/**
 * GET /admin/db-status
 * Get database status and statistics
 */
router.get('/db-status', async (req, res) => {
    try {
        // Test database connection
        await sequelize.authenticate();
        
        // Get table counts
        const userCount = await User.count();
        const projectCount = await Project.count();
        
        res.json({
            success: true,
            database: {
                connected: true,
                dialect: sequelize.getDialect(),
                host: process.env.DB_HOST || 'localhost',
                name: process.env.DB_NAME || 'facility_master'
            },
            statistics: {
                users: userCount,
                projects: projectCount
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ DB status error:', error);
        res.status(500).json({
            success: false,
            database: {
                connected: false
            },
            error: error.message
        });
    }
});

export default router;

