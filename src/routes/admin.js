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
        
        // Sync all models with database
        await sequelize.sync({ alter: true });
        
        console.log('✅ Migrations completed successfully');
        
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
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            roleName: 'admin',
            isActive: true
        });
        
        console.log('✅ Created admin user:', adminUser.email);
        
        // Create demo project
        const demoProject = await Project.create({
            name: 'Demo Project',
            description: 'Default demo project for testing',
            status: 'active',
            createdById: adminUser.id
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

