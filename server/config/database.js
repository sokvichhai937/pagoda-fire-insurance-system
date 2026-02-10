// database.js - SQL Server database connection configuration
// ការកំណត់រចនាសម្ព័ន្ធភ្ជាប់មូលដ្ឋានទិន្នន័យ SQL Server

const sql = require('mssql');
require('dotenv').config();

// SQL Server configuration
const config = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pagoda_insurance',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Use Windows Authentication if no user/password provided
if (process.env.DB_USER && process.env.DB_PASSWORD) {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
  config.authentication = {
    type: 'default'
  };
} else {
  // Windows Authentication
  config.authentication = {
    type: 'ntlm',
    options: {
      domain: process.env.DB_DOMAIN || '',
      userName: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || ''
    }
  };
  config.options.trustedConnection = true;
}

// Create connection pool
const pool = new sql.ConnectionPool(config);

// Connect to database
const connectDB = async () => {
  try {
    await pool.connect();
    console.log('✅ SQL Server connected successfully / SQL Server បានភ្ជាប់ដោយជោគជ័យ');
    return pool;
  } catch (error) {
    console.error('❌ SQL Server connection failed / ការភ្ជាប់ SQL Server បានបរាជ័យ:', error.message);
    throw error;
  }
};

// Export pool and connectDB
module.exports = {
  pool,
  connectDB,
  sql
};
