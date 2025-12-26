# Facility Master API

Enterprise Facility Management Backend with Multi-Tenancy, Role-Based Access Control, and Real-time Notifications.

## 🚀 Features

- **Multi-Tenancy**: Project-based data isolation with granular access control
- **Role Management**: Custom project-specific roles with flexible permissions
- **Enhanced Assignment**: Smart ticket assignment with workload tracking
- **Notification Engine**: Multi-channel notifications (Push, Email, SMS)
- **REST API**: Full-featured RESTful API with JWT authentication
- **WebSocket Support**: Real-time updates for tickets and notifications
- **Audit Logging**: Complete audit trail of all actions

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (optional, for caching and sessions)

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials and other settings

# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

## 🏃‍♂️ Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All API endpoints (except `/health`) require JWT authentication.

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Project Roles

#### List Roles
```http
GET /api/v1/projects/:projectId/roles
```

#### Create Role
```http
POST /api/v1/projects/:projectId/roles
Content-Type: application/json

{
  "name": "Elektrotechniker",
  "description": "Techniker für elektrische Anlagen",
  "color": "#007AFF",
  "icon": "bolt.fill",
  "permissions": {
    "canCreateTickets": true,
    "canEditTickets": true,
    "canAssignTickets": false
  },
  "specialization": ["Elektro", "Beleuchtung"],
  "skillLevel": "Senior",
  "maxConcurrentTickets": 10
}
```

#### Get Role by ID
```http
GET /api/v1/projects/:projectId/roles/:roleId
```

#### Update Role
```http
PUT /api/v1/projects/:projectId/roles/:roleId
Content-Type: application/json

{
  "name": "Senior Elektrotechniker",
  "maxConcurrentTickets": 15
}
```

#### Delete Role
```http
DELETE /api/v1/projects/:projectId/roles/:roleId
```

#### Role Members
```http
GET /api/v1/projects/:projectId/roles/:roleId/members
POST /api/v1/projects/:projectId/roles/:roleId/members
DELETE /api/v1/projects/:projectId/roles/:roleId/members/:userId
```

### Project Members

#### List Members
```http
GET /api/v1/projects/:projectId/members
GET /api/v1/projects/:projectId/members?userType=technician
```

#### Add Member
```http
POST /api/v1/projects/:projectId/members
Content-Type: application/json

{
  "userId": "uuid",
  "roleId": "uuid",
  "userType": "technician",
  "accessLevel": "WRITE",
  "canCreateTickets": true,
  "canEditTickets": true,
  "receiveNotifications": true,
  "notificationChannels": ["push", "email"]
}
```

#### Update Member
```http
PUT /api/v1/projects/:projectId/members/:userId
```

#### Remove Member
```http
DELETE /api/v1/projects/:projectId/members/:userId
```

#### Filter by Type
```http
GET /api/v1/projects/:projectId/members/technicians
GET /api/v1/projects/:projectId/members/contacts
GET /api/v1/projects/:projectId/members/managers
```

#### Check Availability
```http
GET /api/v1/projects/:projectId/members/:userId/availability
GET /api/v1/projects/:projectId/members/available
```

#### Get Permissions
```http
GET /api/v1/projects/:projectId/members/:userId/permissions
```

## 🔐 Permissions

### Access Levels

- **READ**: View project data
- **WRITE**: Create and edit data
- **ADMIN**: Full access including user management

### Granular Permissions

- `canCreateTickets`: Can create new tickets
- `canEditTickets`: Can edit existing tickets
- `canAssignTickets`: Can assign tickets to others
- `canDeleteTickets`: Can delete tickets
- `canApproveWorkflow`: Can approve workflow steps
- `canViewAllTickets`: Can view all tickets or only assigned ones

## 🗄️ Database Schema

The API uses PostgreSQL with the following main tables:

- `projects`: Project/tenant information
- `project_roles`: Custom roles per project
- `user_project_access`: User-project relationships with permissions
- `tickets`: Enhanced ticket system with assignments
- `notifications`: User notifications
- `notification_rules`: Automated notification rules
- `audit_log`: Complete audit trail

## 🔔 Notification System

Supports multi-channel notifications:

- **Push Notifications**: via Firebase Cloud Messaging
- **Email**: via SMTP (NodeMailer)
- **SMS**: via Twilio

Notification events include:

- `ticket:created`
- `ticket:assigned`
- `ticket:status_changed`
- `comment:added`
- `sla:warning`
- And more...

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## 🧪 Testing

```bash
npm test
```

## 🚢 Deployment

For production deployment:

1. Set `NODE_ENV=production` in your `.env`
2. Use a process manager like PM2:

```bash
pm2 start src/server.js --name facility-master-api
```

3. Set up nginx as reverse proxy
4. Configure SSL/TLS certificates
5. Set up database backups

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please follow the coding standards and submit pull requests.

## 📧 Support

For support, email support@facilitymaster.app

---

Built with ❤️ by the FacilityMaster Team








