const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fittrack_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 15000,
  dateStrings: true
};

// Enable secure SSL connectivity for Amazon RDS MySQL when DB_SSL is set to true
if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

// Test database connection and return status without leaking credentials
async function checkDbHealth() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { status: 'healthy', database: process.env.DB_NAME || 'fittrack_db' };
  } catch (err) {
    return { status: 'unhealthy', error: err.message };
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.execute(sql, params),
  checkDbHealth
};
