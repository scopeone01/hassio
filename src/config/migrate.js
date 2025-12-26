import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSqlFile(sqlPath) {
    if (!fs.existsSync(sqlPath)) {
        console.log(`   ⏭ File not found: ${sqlPath}`);
        return { success: 0, skip: 0, error: 0 };
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => {
            const lines = s.split('\n').filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 0 && !trimmed.startsWith('--');
            });
            return lines.length > 0;
        });

    let success = 0, skip = 0, error = 0;

    for (const statement of statements) {
        const preview = statement.substring(0, 50).replace(/\n/g, ' ');
        try {
            await sequelize.query(statement);
            success++;
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('Duplicate') || msg.includes('already exists') || 
                msg.includes('ER_DUP') || msg.includes('ER_TABLE_EXISTS')) {
                skip++;
            } else {
                error++;
                console.log(`   ✗ ${preview}... - ${msg.substring(0, 80)}`);
            }
        }
    }

    return { success, skip, error };
}

async function runMigrations() {
    try {
        console.log('🔄 Starting database migration...');
        console.log(`   Database: ${process.env.DB_NAME || 'facility_master'}`);
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);

        await sequelize.authenticate();
        console.log('✅ Database connection established');

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`📋 Found ${files.length} migration files`);

        let totalSuccess = 0, totalSkip = 0, totalError = 0;

        for (const file of files) {
            console.log(`\n📄 Running: ${file}`);
            const result = await runSqlFile(path.join(migrationsDir, file));
            totalSuccess += result.success;
            totalSkip += result.skip;
            totalError += result.error;
            console.log(`   ✅ ${result.success} | ⏭ ${result.skip} | ❌ ${result.error}`);
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successful: ${totalSuccess}`);
        console.log(`   ⏭  Skipped:    ${totalSkip}`);
        console.log(`   ❌ Errors:     ${totalError}`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigrations();
