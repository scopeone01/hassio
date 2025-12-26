import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    try {
        console.log('🔄 Starting database migration...');
        console.log(`   Database: ${process.env.DB_NAME || 'facility_master'}`);
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);

        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Read SQL file
        const sqlPath = path.join(__dirname, 'migrations', '001_enhanced_roles_system.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.error('❌ Migration file not found:', sqlPath);
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and filter empty statements
        // Handle multi-line statements and comments
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => {
                // Filter out empty statements and pure comment lines
                const lines = s.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 0 && !trimmed.startsWith('--');
                });
                return lines.length > 0;
            });

        console.log(`📋 Found ${statements.length} SQL statements to execute`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            const previewLength = 60;
            const preview = statement.substring(0, previewLength).replace(/\n/g, ' ');
            
            try {
                await sequelize.query(statement);
                successCount++;
                console.log(`   ✓ [${i + 1}/${statements.length}] ${preview}...`);
            } catch (error) {
                // Check if it's a "duplicate" error (column/index already exists)
                const errorMsg = error.message || '';
                const isDuplicate = 
                    errorMsg.includes('Duplicate') || 
                    errorMsg.includes('already exists') ||
                    errorMsg.includes('SQLSTATE[42S21]') || // Duplicate column
                    errorMsg.includes('SQLSTATE[42000]') || // Duplicate key name
                    errorMsg.includes('ER_DUP_FIELDNAME') ||
                    errorMsg.includes('ER_DUP_KEYNAME');

                if (isDuplicate) {
                    skipCount++;
                    console.log(`   ⏭ [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
                } else {
                    errorCount++;
                    console.error(`   ✗ [${i + 1}/${statements.length}] Error: ${preview}...`);
                    console.error(`      ${error.message}`);
                }
            }
        }

        console.log('');
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ⏭  Skipped:    ${skipCount}`);
        console.log(`   ❌ Errors:     ${errorCount}`);
        console.log('');

        if (errorCount === 0) {
            console.log('✅ Migration completed successfully');
        } else {
            console.log('⚠️  Migration completed with some errors (may be expected on re-run)');
        }

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();

