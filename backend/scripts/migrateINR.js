/**
 * FitTrack — Safe INR Currency and Pricing Migration Script
 * Converts existing legacy USD demo records to Indian Rupees (INR / ₹)
 * without dropping tables or deleting user accounts/attendance telemetry.
 */
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateToINR() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'fittrack_db';

  console.log('\n======================================================');
  console.log('  FitTrack INR Currency & Pricing Migration');
  console.log('======================================================');
  console.log(`Connecting to ${dbName} at ${host}:${port} as '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({ host, port, user, password, database: dbName });

    // 1. Ensure table column defaults are INR
    console.log('\n1. Ensuring payments table default is INR...');
    await connection.query("ALTER TABLE `payments` MODIFY COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'INR'");
    console.log('   ✔ Payments table column default set to INR.');

    // 2. Normalize Membership Plan Prices to INR
    console.log('\n2. Updating Membership Plans to standard INR pricing...');
    await connection.query("UPDATE `memberships` SET `price` = 2499.00 WHERE `tier_code` = 'basic' OR `name` LIKE '%Basic%'");
    await connection.query("UPDATE `memberships` SET `price` = 4999.00 WHERE `tier_code` = 'pro' OR `name` LIKE '%Pro%'");
    await connection.query("UPDATE `memberships` SET `price` = 9999.00 WHERE `tier_code` = 'elite' OR `name` LIKE '%Elite%'");
    
    const [memberships] = await connection.query("SELECT id, name, tier_code, price FROM `memberships`");
    memberships.forEach(m => {
      console.log(`   ✔ ${m.name} (${m.tier_code}): ₹${parseFloat(m.price).toLocaleString('en-IN')}`);
    });

    // 3. Normalize Trainer Hourly Rates to INR
    console.log('\n3. Updating Trainer Hourly Rates to realistic INR values...');
    // Elena Rostova
    await connection.query(`
      UPDATE trainers t
      JOIN users u ON t.user_id = u.id
      SET t.hourly_rate = 1500.00
      WHERE u.name LIKE '%Elena%'
    `);
    // Marcus Vance
    await connection.query(`
      UPDATE trainers t
      JOIN users u ON t.user_id = u.id
      SET t.hourly_rate = 1800.00
      WHERE u.name LIKE '%Marcus Vance%'
    `);
    // Dr. Derrick Thorne
    await connection.query(`
      UPDATE trainers t
      JOIN users u ON t.user_id = u.id
      SET t.hourly_rate = 2200.00
      WHERE u.name LIKE '%Derrick%'
    `);
    // Aria Kincaid
    await connection.query(`
      UPDATE trainers t
      JOIN users u ON t.user_id = u.id
      SET t.hourly_rate = 1400.00
      WHERE u.name LIKE '%Aria%'
    `);

    const [trainers] = await connection.query(`
      SELECT t.id, u.name, t.hourly_rate
      FROM trainers t
      JOIN users u ON t.user_id = u.id
    `);
    trainers.forEach(t => {
      console.log(`   ✔ ${t.name}: ₹${parseFloat(t.hourly_rate).toLocaleString('en-IN')}/hr`);
    });

    // 4. Normalize Payments: Currency, Amounts, Payment Methods, and Notes
    console.log('\n4. Updating Payments ledger to INR currency and payment rails...');
    
    // Set currency to INR everywhere
    await connection.query("UPDATE `payments` SET `currency` = 'INR'");

    // Convert legacy small USD amounts to equivalent INR tier amounts
    await connection.query("UPDATE `payments` SET `amount` = 9999.00 WHERE `amount` BETWEEN 180.00 AND 210.00");
    await connection.query("UPDATE `payments` SET `amount` = 4999.00 WHERE `amount` BETWEEN 80.00 AND 160.00");
    await connection.query("UPDATE `payments` SET `amount` = 2499.00 WHERE `amount` BETWEEN 30.00 AND 60.00");

    // Replace Western payment methods with simulated Indian payment rails
    await connection.query("UPDATE `payments` SET `payment_method` = 'e-NACH AutoPay / NetBanking' WHERE `payment_method` LIKE '%SEPA%'");
    await connection.query("UPDATE `payments` SET `payment_method` = 'UPI / QR POS Terminal' WHERE `payment_method` LIKE '%Apple%'");
    await connection.query("UPDATE `payments` SET `payment_method` = 'RuPay / Card POS Terminal' WHERE `payment_method` LIKE '%Credit Card%'");
    await connection.query("UPDATE `payments` SET `payment_method` = 'Front Desk Cash POS' WHERE `payment_method` LIKE '%Front Desk%' OR `payment_method` LIKE '%Cash%'");

    // Update notes
    await connection.query("UPDATE `payments` SET `notes` = REPLACE(`notes`, 'SEPA core', 'e-NACH AutoPay mandate')");

    // 5. Verify the updated totals
    const [[{ total_rev }]] = await connection.query("SELECT COALESCE(SUM(amount), 0) AS total_rev FROM `payments` WHERE `status` = 'paid'");
    const [[{ count_usd }]] = await connection.query("SELECT COUNT(*) AS count_usd FROM `payments` WHERE `currency` != 'INR'");
    const [[{ total_tx }]] = await connection.query("SELECT COUNT(*) AS total_tx FROM `payments`");

    console.log(`\n======================================================`);
    console.log(`  Migration Complete Summary`);
    console.log(`======================================================`);
    console.log(`- Total Transactions Processed: ${total_tx}`);
    console.log(`- Non-INR Currency Count:       ${count_usd} (should be 0)`);
    console.log(`- Total Settled Revenue:        ₹${parseFloat(total_rev).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  migrateToINR();
}

module.exports = migrateToINR;

