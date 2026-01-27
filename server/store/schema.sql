-- HookLens v1.2 Database Schema
-- SQLite database for persistent webhook endpoint and request storage

-- Endpoints table
-- Stores webhook endpoint configurations
CREATE TABLE IF NOT EXISTS endpoints (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status_code INTEGER DEFAULT 200,
  response_body TEXT DEFAULT 'OK',
  content_type TEXT DEFAULT 'text/plain',
  delay INTEGER DEFAULT 0,
  forward_url TEXT DEFAULT NULL,
  auto_forward INTEGER DEFAULT 0
);

-- Requests table
-- Stores captured webhook requests with foreign key to endpoints
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  headers TEXT NOT NULL,
  query TEXT,
  body TEXT,
  body_size INTEGER DEFAULT 0,
  content_type TEXT,
  is_json INTEGER DEFAULT 0,
  parsed_body TEXT,
  ip TEXT,
  user_agent TEXT,
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_requests_endpoint ON requests(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_endpoints_expires ON endpoints(expires_at);
