import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';

// Import database config
import sequelize, { testConnection } from './config/database.js';

// Import models to register associations
import './models/associations.js';

// Import dynamic route service
import dynamicRouteService from './services/dynamicRouteService.js';

// Import routes
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import projectsRouter from './routes/projects.js';
import projectRolesRouter from './routes/projectRoles.js';
import projectMembersRouter from './routes/projectMembers.js';
import notificationsRouter from './routes/notifications.js';
import ticketsRouter from './routes/tickets.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Store for dynamic routes info
let dynamicRoutesInfo = [];

// ==========================================
// Middleware
// ==========================================

// Security
app.use(helmet());

// CORS - allow all origins for Home Assistant
const corsOptions = {
    origin: '*',
    credentials: true
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(`/api/${API_VERSION}`, limiter);

// ==========================================
// Routes
// ==========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        dynamicRoutes: dynamicRoutesInfo.length
    });
});

// API info
app.get(`/api/${API_VERSION}`, (req, res) => {
    res.json({
        name: 'Facility Master API',
        version: API_VERSION,
        description: 'Enterprise Facility Management Backend with Dynamic Routes',
        documentation: `/api/${API_VERSION}/docs`,
        endpoints: {
            auth: `/api/${API_VERSION}/auth`,
            users: `/api/${API_VERSION}/users`,
            projects: `/api/${API_VERSION}/projects`,
            tickets: `/api/${API_VERSION}/tickets`,
            notifications: `/api/${API_VERSION}/notifications`,
            dynamicRoutes: `/api/${API_VERSION}/dynamic-routes`,
            health: '/health'
        },
        dynamicRoutes: dynamicRoutesInfo
    });
});

// Dynamic routes schema endpoint
app.get(`/api/${API_VERSION}/dynamic-routes`, (req, res) => {
    res.json({
        success: true,
        routes: dynamicRoutesInfo,
        schema: dynamicRouteService.getSchema()
    });
});

// API routes
app.use(`/api/${API_VERSION}/auth`, authRouter);
app.use(`/api/${API_VERSION}/users`, usersRouter);
app.use(`/api/${API_VERSION}/projects`, projectsRouter);
app.use(`/api/${API_VERSION}/projects`, projectRolesRouter);
app.use(`/api/${API_VERSION}/projects`, projectMembersRouter);
app.use(`/api/${API_VERSION}/notifications`, notificationsRouter);
app.use(`/api/${API_VERSION}/tickets`, ticketsRouter);

// 404 handler (registered after dynamic routes)
function register404Handler() {
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: req.path
        });
    });
}

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ==========================================
// Load Custom Routes from Config
// ==========================================

async function loadCustomRoutes() {
    // Check for custom routes in environment variable (JSON string)
    const customRoutesEnv = process.env.CUSTOM_ROUTES;
    
    // Or load from file
    const configPath = '/data/options.json';
    
    let customRoutes = [];
    
    // Try environment variable first
    if (customRoutesEnv) {
        try {
            customRoutes = JSON.parse(customRoutesEnv);
            console.log(`📦 Loaded ${customRoutes.length} custom routes from environment`);
        } catch (e) {
            console.warn('⚠️ Failed to parse CUSTOM_ROUTES environment variable');
        }
    }
    
    // Try Home Assistant options.json
    if (customRoutes.length === 0 && fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.custom_routes && Array.isArray(config.custom_routes)) {
                customRoutes = config.custom_routes;
                console.log(`📦 Loaded ${customRoutes.length} custom routes from options.json`);
            }
        } catch (e) {
            console.warn('⚠️ Failed to load custom routes from options.json');
        }
    }
    
    // Try local config file for development
    const localConfigPath = './custom-routes.json';
    if (customRoutes.length === 0 && fs.existsSync(localConfigPath)) {
        try {
            customRoutes = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
            console.log(`📦 Loaded ${customRoutes.length} custom routes from local config`);
        } catch (e) {
            console.warn('⚠️ Failed to load custom routes from local config');
        }
    }
    
    if (customRoutes.length > 0) {
        const routes = await dynamicRouteService.initializeRoutes(customRoutes);
        
        // Register dynamic routes
        for (const { path, router, config } of routes) {
            const fullPath = `/api/${API_VERSION}${path}`;
            app.use(fullPath, router);
            
            dynamicRoutesInfo.push({
                path: fullPath,
                table: config.table,
                methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE'],
                fields: (config.fields || []).map(f => ({ name: f.name, type: f.type }))
            });
            
            console.log(`   🛣️  Registered: ${fullPath}`);
        }
    }
    
    return customRoutes.length;
}

// ==========================================
// Server startup
// ==========================================

async function startServer() {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Server not started.');
            process.exit(1);
        }
        
        // Sync database models
        await sequelize.sync({ alter: false });
        console.log('✅ Database models synchronized');
        
        // Load custom routes
        const customRoutesCount = await loadCustomRoutes();
        
        // Register 404 handler after all routes
        register404Handler();
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('╔══════════════════════════════════════════════════╗');
            console.log('║      🏢 Facility Master API Server              ║');
            console.log('╚══════════════════════════════════════════════════╝');
            console.log('');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
            console.log(`📡 API Base URL: http://0.0.0.0:${PORT}/api/${API_VERSION}`);
            console.log(`💚 Health Check: http://0.0.0.0:${PORT}/health`);
            console.log(`📦 Custom Routes: ${customRoutesCount}`);
            console.log('');
            
            if (dynamicRoutesInfo.length > 0) {
                console.log('Dynamic Routes:');
                for (const route of dynamicRoutesInfo) {
                    console.log(`  - ${route.methods.join(',')} ${route.path} -> ${route.table}`);
                }
                console.log('');
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

// Start the server
startServer();

export default app;
