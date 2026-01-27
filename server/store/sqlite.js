const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const {
  MAX_ENDPOINTS,
  MAX_REQUESTS_PER_ENDPOINT,
  ENDPOINT_TTL,
  DEFAULT_STATUS_CODE,
  DEFAULT_RESPONSE_BODY,
  DEFAULT_CONTENT_TYPE,
  DB_PATH,
  CLEANUP_INTERVAL
} = require('../config/constants');

class SQLiteStore {
  constructor() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initSchema();

    setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
    
    console.log(`SQLite database initialized at ${DB_PATH}`);
  }

  initSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    this.db.exec(schema);
    
    // Run migrations for existing databases
    this.runMigrations();
  }
  
  runMigrations() {
    // Migration for v1.2: Add forwarding columns
    try {
      // Check if columns exist
      const tableInfo = this.db.prepare('PRAGMA table_info(endpoints)').all();
      const hasForwardUrl = tableInfo.some(col => col.name === 'forward_url');
      const hasAutoForward = tableInfo.some(col => col.name === 'auto_forward');
      
      if (!hasForwardUrl) {
        this.db.exec('ALTER TABLE endpoints ADD COLUMN forward_url TEXT DEFAULT NULL');
        console.log('Migration: Added forward_url column to endpoints');
      }
      
      if (!hasAutoForward) {
        this.db.exec('ALTER TABLE endpoints ADD COLUMN auto_forward INTEGER DEFAULT 0');
        console.log('Migration: Added auto_forward column to endpoints');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  createEndpoint() {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM endpoints').get().count;
    
    if (count >= MAX_ENDPOINTS) {
      const oldest = this.db
        .prepare('SELECT id FROM endpoints ORDER BY created_at ASC LIMIT 1')
        .get();
      if (oldest) {
        this.deleteEndpoint(oldest.id);
      }
    }

    const id = nanoid(12);
    const now = Date.now();
    const endpoint = {
      id,
      createdAt: now,
      expiresAt: now + ENDPOINT_TTL,
      config: {
        statusCode: DEFAULT_STATUS_CODE,
        responseBody: DEFAULT_RESPONSE_BODY,
        contentType: DEFAULT_CONTENT_TYPE,
        delay: 0,
        forwardUrl: null,
        autoForward: false
      },
      requests: []
    };

    const insert = this.db.prepare(`
      INSERT INTO endpoints (id, created_at, expires_at, status_code, response_body, content_type, delay, forward_url, auto_forward)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      endpoint.id,
      endpoint.createdAt,
      endpoint.expiresAt,
      endpoint.config.statusCode,
      endpoint.config.responseBody,
      endpoint.config.contentType,
      endpoint.config.delay,
      endpoint.config.forwardUrl,
      endpoint.config.autoForward ? 1 : 0
    );

    return endpoint;
  }

  getEndpoint(id) {
    const row = this.db
      .prepare('SELECT * FROM endpoints WHERE id = ?')
      .get(id);

    if (!row) return null;

    if (Date.now() > row.expires_at) {
      this.deleteEndpoint(id);
      return null;
    }

    const requests = this.db
      .prepare(
        'SELECT * FROM requests WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT ?'
      )
      .all(id, MAX_REQUESTS_PER_ENDPOINT);

    return {
      id: row.id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      config: {
        statusCode: row.status_code,
        responseBody: row.response_body,
        contentType: row.content_type,
        delay: row.delay,
        forwardUrl: row.forward_url,
        autoForward: row.auto_forward === 1
      },
      requests: requests.map(this.rowToRequest)
    };
  }

  addRequest(endpointId, request) {
    const endpoint = this.getEndpoint(endpointId);
    if (!endpoint) return null;

    const insert = this.db.prepare(`
      INSERT INTO requests (
        id, endpoint_id, timestamp, method, path,
        headers, query, body, body_size, content_type,
        is_json, parsed_body, ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      request.id,
      endpointId,
      request.timestamp,
      request.method,
      request.path,
      JSON.stringify(request.headers || {}),
      JSON.stringify(request.query || {}),
      request.body,
      request.bodySize || 0,
      request.contentType,
      request.isJson ? 1 : 0,
      request.parsedBody ? JSON.stringify(request.parsedBody) : null,
      request.ip,
      request.userAgent
    );

    const deleteOld = this.db.prepare(`
      DELETE FROM requests 
      WHERE endpoint_id = ? 
      AND id NOT IN (
        SELECT id FROM requests 
        WHERE endpoint_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      )
    `);
    deleteOld.run(endpointId, endpointId, MAX_REQUESTS_PER_ENDPOINT);

    return request;
  }

  updateConfig(endpointId, config) {
    const endpoint = this.getEndpoint(endpointId);
    if (!endpoint) return null;

    const updates = { ...endpoint.config, ...config };
    
    const update = this.db.prepare(`
      UPDATE endpoints 
      SET status_code = ?, response_body = ?, content_type = ?, delay = ?, forward_url = ?, auto_forward = ?
      WHERE id = ?
    `);

    update.run(
      updates.statusCode,
      updates.responseBody,
      updates.contentType,
      updates.delay,
      updates.forwardUrl || null,
      updates.autoForward ? 1 : 0,
      endpointId
    );

    return updates;
  }

  clearRequests(endpointId) {
    const endpoint = this.getEndpoint(endpointId);
    if (!endpoint) return null;

    const countResult = this.db
      .prepare('SELECT COUNT(*) as count FROM requests WHERE endpoint_id = ?')
      .get(endpointId);
    
    const count = countResult ? countResult.count : 0;

    this.db.prepare('DELETE FROM requests WHERE endpoint_id = ?').run(endpointId);

    return count;
  }

  deleteEndpoint(id) {
    const result = this.db.prepare('DELETE FROM endpoints WHERE id = ?').run(id);
    return result.changes > 0;
  }

  cleanup() {
    const now = Date.now();
    const result = this.db
      .prepare('DELETE FROM endpoints WHERE expires_at < ?')
      .run(now);
    
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired endpoints`);
    }
  }

  getStats() {
    const endpointCount = this.db
      .prepare('SELECT COUNT(*) as count FROM endpoints')
      .get().count;
    
    const totalRequests = this.db
      .prepare('SELECT COUNT(*) as count FROM requests')
      .get().count;

    return {
      endpointCount,
      totalRequests
    };
  }

  rowToRequest(row) {
    return {
      id: row.id,
      timestamp: row.timestamp,
      method: row.method,
      path: row.path,
      headers: safeJsonParse(row.headers, {}),
      query: safeJsonParse(row.query, {}),
      body: row.body,
      bodySize: row.body_size,
      contentType: row.content_type,
      isJson: Boolean(row.is_json),
      parsedBody: safeJsonParse(row.parsed_body, null),
      ip: row.ip,
      userAgent: row.user_agent
    };
  }
}

function safeJsonParse(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

module.exports = new SQLiteStore();
