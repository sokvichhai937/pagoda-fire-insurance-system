// database.js - MySQL database connection configuration
// ការកំណត់រចនាសម្ព័ន្ធភ្ជាប់មូលដ្ឋានទិន្នន័យ MySQL

const mysql = require('mysql2');
const config = require('./config');

// Create connection pool for better performance
// បង្កើត connection pool សម្រាប់ការអនុវត្តល្អប្រសើរ
const pool = mysql.createPool(config.db);

// Get promise-based pool for async/await
// ទទួលបាន promise-based pool សម្រាប់ async/await
const promisePool = pool.promise();

// Test database connection
// សាកល្បងការភ្ជាប់មូលដ្ឋានទិន្នន័យ
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully / មូលដ្ឋានទិន្នន័យបានភ្ជាប់ដោយជោគជ័យ');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed / ការភ្ជាប់មូលដ្ឋានទិន្នន័យបានបរាជ័យ:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  promisePool,
  testConnection
};
