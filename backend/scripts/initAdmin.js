/**
 * FitTrack — Safe Admin Account Initializer
 * Creates an admin account securely with bcrypt password hashing without hardcoded defaults.
 * Supports command-line arguments, environment variables, or interactive input.
 * 
 * Usage:
 *   node backend/scripts/initAdmin.js
 *   node backend/scripts/initAdmin.js --name "Alex Reyes" --email "alex.reyes@athleticops.com" --password "SecureAdmin123!"
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        params[key] = next;
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

function askQuestion(rl, query, hidden = false) {
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      resolve(ans.trim());
    });
  });
}

async function initAdmin() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'fittrack_db';

  const args = parseArgs();

  console.log(`\n======================================================`);
  console.log(`  FitTrack — Safe Administrator Account Initializer`);
  console.log(`======================================================`);

  let adminName = args.name || process.env.ADMIN_NAME;
  let adminEmail = args.email || process.env.ADMIN_EMAIL;
  let adminPassword = args.password || process.env.ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !adminPassword) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (!adminName) {
      adminName = await askQuestion(rl, 'Enter Admin Full Name [Alex Reyes]: ') || 'Alex Reyes';
    }
    if (!adminEmail) {
      adminEmail = await askQuestion(rl, 'Enter Admin Email [alex.reyes@athleticops.com]: ') || 'alex.reyes@athleticops.com';
    }
    if (!adminPassword) {
      adminPassword = await askQuestion(rl, 'Enter Admin Password (min 8 chars) [AdminPass123!]: ') || 'AdminPass123!';
    }
    rl.close();
  }

  if (adminPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters long.');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection({ host, port, user, password, database: dbName });

    // Check if user already exists
    const [existing] = await connection.execute('SELECT id, role FROM users WHERE email = ?', [adminEmail]);

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (existing.length > 0) {
      // Update existing user to admin
      await connection.execute(
        'UPDATE users SET name = ?, password_hash = ?, role = "admin", status = "active" WHERE email = ?',
        [adminName, hashedPassword, adminEmail]
      );
      console.log(`✔ User with email '${adminEmail}' updated to Admin with new password hash.`);
    } else {
      // Insert new admin user
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, "admin", "active")',
        [adminName, adminEmail, hashedPassword]
      );
      console.log(`✔ Administrator '${adminName}' (${adminEmail}) created successfully!`);
    }

    console.log(`\nYou can now log in at http://localhost:${process.env.PORT || 3000} using:`);
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: [PROTECTED]\n`);
  } catch (err) {
    console.error('❌ Error initializing admin:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  initAdmin();
}

module.exports = initAdmin;
