import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import database config
import sequelize, { testConnection } from './config/database.js';

// Import models to register associations
import './models/associations.js';

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

// ==========================================
// Middleware
// ==========================================

// Security
app.use(helmet());

// CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:5173'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Note: For multipart/form-data (file uploads), we'll use multer in specific routes

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
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
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
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info
app.get(`/api/${API_VERSION}`, (req, res) => {
    res.json({
        name: 'Facility Master API',
        version: API_VERSION,
        description: 'Enterprise Facility Management Backend with Multi-Tenancy',
        documentation: `/api/${API_VERSION}/docs`,
        endpoints: {
            projectRoles: `/api/${API_VERSION}/projects/:projectId/roles`,
            projectMembers: `/api/${API_VERSION}/projects/:projectId/members`,
            notifications: `/api/${API_VERSION}/notifications`,
            tickets: `/api/${API_VERSION}/tickets/:ticketId/assign`,
            health: '/health'
        }
    });
});

// API routes
app.use(`/api/${API_VERSION}/auth`, authRouter);
app.use(`/api/${API_VERSION}/users`, usersRouter);
app.use(`/api/${API_VERSION}/projects`, projectsRouter); // Must be before other project routes
app.use(`/api/${API_VERSION}/projects`, projectRolesRouter);
app.use(`/api/${API_VERSION}/projects`, projectMembersRouter);
app.use(`/api/${API_VERSION}/notifications`, notificationsRouter);
app.use(`/api/${API_VERSION}/tickets`, ticketsRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

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
        
        // Sync database models (in development)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: false });
            console.log('✅ Database models synchronized');
        }
        
        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('╔══════════════════════════════════════════════════╗');
            console.log('║      🏢 Facility Master API Server              ║');
            console.log('╚══════════════════════════════════════════════════╝');
            console.log('');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📡 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
            console.log(`💚 Health Check: http://localhost:${PORT}/health`);
            console.log('');
            console.log('Available endpoints:');
            console.log(`  - GET    /api/${API_VERSION}/projects/:id/roles`);
            console.log(`  - POST   /api/${API_VERSION}/projects/:id/roles`);
            console.log(`  - GET    /api/${API_VERSION}/projects/:id/members`);
            console.log(`  - POST   /api/${API_VERSION}/projects/:id/members`);
            console.log(`  - GET    /api/${API_VERSION}/notifications`);
            console.log(`  - POST   /api/${API_VERSION}/tickets/:id/assign`);
            console.log(`  - GET    /api/${API_VERSION}/tickets/:id/assignable-users`);
            console.log('');
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

