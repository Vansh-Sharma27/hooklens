// Store Factory - Selects storage backend based on environment
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'sqlite';

let store;

if (STORAGE_TYPE === 'memory') {
  console.log('Using in-memory storage (data will not persist)');
  store = require('./memory');
} else if (STORAGE_TYPE === 'sqlite') {
  console.log('Using SQLite storage (data persists across restarts)');
  store = require('./sqlite');
} else {
  console.warn(`Unknown STORAGE_TYPE: ${STORAGE_TYPE}, defaulting to sqlite`);
  store = require('./sqlite');
}

module.exports = store;
