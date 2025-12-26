// Quick database connection test
import sequelize from './src/config/database.js';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Tipps:');
    console.log('   1. Stelle sicher, dass PostgreSQL läuft: brew services list | grep postgres');
    console.log('   2. Prüfe die .env Datei (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
    console.log('   3. Bei lokaler Installation: Verwende deinen System-User statt "postgres"');
    process.exit(1);
  }
})();








