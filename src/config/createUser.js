//
//  createUser.js
//  FacilityMaster API
//
//  Script zum Erstellen eines neuen Benutzers über die Kommandozeile
//

import sequelize from './database.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import '../models/associations.js'; // Ensure associations are loaded

async function createUser(userData) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      roleName = 'USER',
      isTechnician = false,
      projectIds = [],
      accessLevel = 'READ',
      userType = 'Contact'
    } = userData;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      console.error('❌ Fehler: firstName, lastName, email und password sind erforderlich');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error(`❌ Fehler: Benutzer mit E-Mail ${email} existiert bereits`);
      process.exit(1);
    }

    // Create user
    const user = await User.create({
      id: uuidv4(),
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by model hook
      phoneNumber: phoneNumber || null,
      roleName: roleName.toUpperCase(),
      isTechnician: isTechnician,
      isActive: true,
      createdBy: null, // System created
    });

    console.log(`✅ Benutzer erstellt: ${user.firstName} ${user.lastName} (${user.email})`);

    // Assign to projects if provided
    if (projectIds.length > 0) {
      for (const projectId of projectIds) {
        const project = await Project.findByPk(projectId);
        if (!project) {
          console.warn(`⚠️  Projekt ${projectId} nicht gefunden, überspringe...`);
          continue;
        }

        await UserProjectAccess.create({
          userId: user.id,
          projectId: projectId,
          accessLevel: accessLevel,
          userType: userType,
          canCreateTickets: true,
          canEditTickets: accessLevel === 'WRITE' || accessLevel === 'ADMIN',
          canAssignTickets: accessLevel === 'ADMIN',
          canDeleteTickets: accessLevel === 'ADMIN',
          canApproveWorkflow: accessLevel === 'ADMIN',
          canViewAllTickets: accessLevel === 'ADMIN',
          receiveNotifications: true,
          notificationChannels: ['push', 'email'],
          grantedBy: null, // System granted
          grantedAt: new Date(),
        });

        console.log(`  ✅ Zugewiesen zu Projekt: ${project.name}`);
      }
    } else {
      console.log('ℹ️  Keine Projekte zugewiesen. Benutzer kann später über die App zugewiesen werden.');
    }

    console.log('\n✅ Benutzer erfolgreich erstellt!');
    console.log(`   E-Mail: ${user.email}`);
    console.log(`   Passwort: ${password}`);
    console.log(`   Rolle: ${user.roleName}`);
    console.log(`   Techniker: ${user.isTechnician ? 'Ja' : 'Nein'}`);

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Benutzers:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log(`
📝 Verwendung: node src/config/createUser.js <firstName> <lastName> <email> <password> [options]

Erforderliche Parameter:
  firstName    Vorname des Benutzers
  lastName     Nachname des Benutzers
  email        E-Mail-Adresse (muss eindeutig sein)
  password     Passwort für den Benutzer

Optionale Parameter:
  --phone <number>              Telefonnummer
  --role <ROLE>                 Rolle: USER, TECHNICIAN, ADMIN (Standard: USER)
  --technician                  Als Techniker markieren
  --project <projectId>         Projekt-ID zuweisen (kann mehrfach verwendet werden)
  --access <LEVEL>              Zugriffslevel: READ, WRITE, ADMIN (Standard: READ)
  --type <TYPE>                 Benutzertyp: Contact, Technician, Manager, Admin (Standard: Contact)

Beispiele:
  # Einfacher Benutzer
  node src/config/createUser.js Max Mustermann max@example.com passwort123

  # Techniker mit Projekt-Zuordnung
  node src/config/createUser.js Peter Techniker peter@example.com passwort123 \\
    --role TECHNICIAN --technician \\
    --project <project-uuid> --access WRITE --type Technician

  # Admin-Benutzer
  node src/config/createUser.js Admin User admin2@example.com admin123 \\
    --role ADMIN --access ADMIN --type Admin
  `);
  process.exit(1);
}

const [firstName, lastName, email, password] = args;

const userData = {
  firstName,
  lastName,
  email,
  password,
  phoneNumber: null,
  roleName: 'USER',
  isTechnician: false,
  projectIds: [],
  accessLevel: 'READ',
  userType: 'Contact'
};

// Parse optional arguments
for (let i = 4; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--phone' && args[i + 1]) {
    userData.phoneNumber = args[++i];
  } else if (arg === '--role' && args[i + 1]) {
    userData.roleName = args[++i].toUpperCase();
  } else if (arg === '--technician') {
    userData.isTechnician = true;
  } else if (arg === '--project' && args[i + 1]) {
    userData.projectIds.push(args[++i]);
  } else if (arg === '--access' && args[i + 1]) {
    userData.accessLevel = args[++i].toUpperCase();
  } else if (arg === '--type' && args[i + 1]) {
    userData.userType = args[++i];
  }
}

createUser(userData);








