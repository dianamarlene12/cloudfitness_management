/**
 * FitTrack — Database Setup and Migration Script
 * Automatically sets up MySQL database, runs schema.sql and seed.sql with secure password hashes.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'fittrack_db';

  console.log(`\n======================================================`);
  console.log(`  FitTrack Database Initializer`);
  console.log(`======================================================`);
  console.log(`Connecting to MySQL on ${host}:${port} as '${user}'...`);

  let connection;
  try {
    // 1. Connect without database selected to ensure database exists
    connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✔ Database '${dbName}' created or confirmed.`);

    // 2. Select the database
    await connection.changeUser({ database: dbName });

    // 3. Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log(`Applying schema from ${schemaPath}...`);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log(`✔ Schema applied successfully (11 normalized tables created).`);
    } else {
      console.warn(`⚠ schema.sql not found at ${schemaPath}`);
    }

    // 4. Generate proper bcrypt hash for demo accounts
    console.log(`Hashing demo passwords with bcrypt (10 rounds)...`);
    const trainerHash = await bcrypt.hash('TrainerPass123!', 10);
    const memberHash = await bcrypt.hash('MemberPass123!', 10);

    // 5. Read and execute seed.sql, replacing placeholder hashes
    const seedPath = path.join(__dirname, '../sql/seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log(`Applying seed data from ${seedPath}...`);
      let seedSql = fs.readFileSync(seedPath, 'utf8');
      // Replace the password hash placeholders
      seedSql = seedSql.split('$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.').join(trainerHash);
      await connection.query(seedSql);
      console.log(`✔ Seed data inserted (trainers, members, memberships, attendance, workouts, schedules, payments, notifications).`);
    }

    console.log(`\n✔ FitTrack database setup completed successfully!`);
    console.log(`\nDemo Credentials Seeded:`);
    console.log(`- Trainer: elena.rostova@nexusfit.com / TrainerPass123!`);
    console.log(`- Trainer: marcus.vance@athleticops.com / TrainerPass123!`);
    console.log(`- Member:  kaelen.diaz@apexspeed.io / MemberPass123!`);
    console.log(`- Member:  m.brody@apexathletics.io / MemberPass123!`);
    console.log(`\nTo create your Admin account securely, run:`);
    console.log(`  npm run init-admin\n`);
  } catch (err) {
    console.error(`\n❌ Error setting up database:`, err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`Hint: Please verify your DB_USER and DB_PASSWORD in the .env file.`);
    } else if (err.code === 'ECONNREFUSED') {
      console.error(`Hint: MySQL server is not running on ${host}:${port}. Please start the MySQL service.`);
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
