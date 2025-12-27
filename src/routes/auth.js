import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import Project from '../models/Project.js';
import bcrypt from 'bcrypt';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body?.email, hasPassword: !!req.body?.password });
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
    }

    // Find user in database
    console.log('🔍 Searching for user:', email);
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    console.log('✅ User found:', { id: user.id, email: user.email, isActive: user.isActive });

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User inactive:', email);
      return res.status(403).json({ error: 'Account ist deaktiviert' });
    }

    // Verify password
    console.log('🔐 Verifying password for:', email);
    const isPasswordValid = await user.checkPassword(password);
    console.log('🔐 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Admins see all projects, other users see only projects they have access to
    let availableProjects = [];
    
    if (user.roleName === 'ADMIN') {
      // Admins see all projects
      const allProjects = await Project.findAll({
        attributes: ['id', 'name', 'projectNumber'],
      });
      
      availableProjects = allProjects.map(project => ({
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        accessLevel: 'ADMIN',
        userType: 'admin',
      }));
    } else {
      // Get user's project access
      const projectAccess = await UserProjectAccess.findAll({
        where: { userId: user.id },
      });

      // Get project details - only include projects that actually exist
      const projectIds = projectAccess.map(pa => pa.projectId);
      const projects = projectIds.length > 0 ? await Project.findAll({
        where: { id: projectIds },
        attributes: ['id', 'name', 'projectNumber'],
      }) : [];

      const projectMap = new Map(projects.map(p => [p.id, p]));

      // Build available projects list - only include projects that exist
      // Filter out any projectAccess entries that reference non-existent projects
      availableProjects = projectAccess
        .filter(access => projectMap.has(access.projectId)) // Only include existing projects
        .map(access => ({
          id: access.projectId,
          name: projectMap.get(access.projectId).name,
          projectNumber: projectMap.get(access.projectId).projectNumber,
          accessLevel: access.accessLevel,
          userType: access.userType,
        }));
    }

    // Auto-select project if user has only one
    const autoSelectedProject = availableProjects.length === 1 ? availableProjects[0] : null;

    // JWT Token generieren (30 days if rememberMe, otherwise 24h)
    const { rememberMe } = req.body;
    const expiresIn = rememberMe ? '30d' : '24h';

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.roleName
      },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn }
    );

    console.log(`✅ Token generated with expiry: ${expiresIn}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        roleName: user.roleName,
        isTechnician: user.isTechnician,
      },
      availableProjects,
      autoSelectedProject, // Project automatically selected if only one
      requiresProjectSelection: availableProjects.length > 1, // True if user needs to select a project
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Fehler beim Anmelden' });
  }
});

// Switch project (for users with multiple projects)
router.post('/switch-project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user has access to this project
    const projectAccess = await UserProjectAccess.findOne({
      where: { userId, projectId },
    });

    if (!projectAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Get project details
    const project = await Project.findByPk(projectId, {
      attributes: ['id', 'name', 'projectNumber'],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        accessLevel: projectAccess.accessLevel,
        userType: projectAccess.userType,
      },
    });
  } catch (error) {
    console.error('Switch project error:', error);
    res.status(500).json({ error: 'Fehler beim Projektwechsel' });
  }
});

// Verify Token
router.get('/verify', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Kein Token bereitgestellt' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production');
    
    // Get user from database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleName: user.roleName,
        isTechnician: user.isTechnician,
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
});

export default router;

