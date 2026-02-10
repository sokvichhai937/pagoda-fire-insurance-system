// db.js - Database wrapper providing SQLite-style API for MSSQL
// ឯកសារ db.js - កញ្ចប់មូលដ្ឋានទិន្នន័យដែលផ្តល់ API ស្រដៀងនឹង SQLite សម្រាប់ MSSQL

const { pool, sql } = require('../config/database');

/**
 * Execute a query and return all rows
 * @param {string} query - SQL query with ? placeholders
 * @param {Array} params - Parameters to bind to query
 * @returns {Array} Array of rows
 */
async function all(query, params = []) {
  const request = pool.request();
  
  // Convert ? placeholders to @param1, @param2, etc.
  let mssqlQuery = query;
  params.forEach((param, index) => {
    const paramName = `param${index + 1}`;
    mssqlQuery = mssqlQuery.replace('?', `@${paramName}`);
    request.input(paramName, param);
  });
  
  const result = await request.query(mssqlQuery);
  return result.recordset;
}

/**
 * Execute a query and return first row
 * @param {string} query - SQL query with ? placeholders
 * @param {Array} params - Parameters to bind to query
 * @returns {Object|undefined} First row or undefined
 */
async function get(query, params = []) {
  const request = pool.request();
  
  // Convert ? placeholders to @param1, @param2, etc.
  let mssqlQuery = query;
  params.forEach((param, index) => {
    const paramName = `param${index + 1}`;
    mssqlQuery = mssqlQuery.replace('?', `@${paramName}`);
    request.input(paramName, param);
  });
  
  const result = await request.query(mssqlQuery);
  return result.recordset[0];
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 * @param {string} query - SQL query with ? placeholders
 * @param {Array} params - Parameters to bind to query
 * @returns {Object} Result object with lastID and changes properties
 */
async function run(query, params = []) {
  const request = pool.request();
  
  // Convert ? placeholders to @param1, @param2, etc.
  let mssqlQuery = query;
  params.forEach((param, index) => {
    const paramName = `param${index + 1}`;
    mssqlQuery = mssqlQuery.replace('?', `@${paramName}`);
    request.input(paramName, param);
  });
  
  // For INSERT queries, modify to return SCOPE_IDENTITY()
  if (mssqlQuery.trim().toUpperCase().startsWith('INSERT')) {
    mssqlQuery += '; SELECT SCOPE_IDENTITY() AS lastID';
  }
  
  const result = await request.query(mssqlQuery);
  
  // Return object compatible with SQLite format
  return {
    lastID: result.recordset && result.recordset[0] ? result.recordset[0].lastID : undefined,
    changes: result.rowsAffected[0] || 0
  };
}

module.exports = {
  all,
  get,
  run,
  pool,
  sql
};
