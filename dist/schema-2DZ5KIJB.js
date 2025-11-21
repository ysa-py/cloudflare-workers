import "./chunk-6C3VEZWH.js";

// src/db/schema.ts
var CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  uuid TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiration_date TEXT NOT NULL,
  expiration_time TEXT NOT NULL,
  notes TEXT,
  traffic_limit INTEGER,
  traffic_used INTEGER DEFAULT 0,
  ip_limit INTEGER DEFAULT -1
);
`;
var CREATE_USER_IPS_TABLE = `
CREATE TABLE IF NOT EXISTS user_ips (
  uuid TEXT,
  ip TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid, ip)
);
`;
var CREATE_PROXY_HEALTH_TABLE = `
CREATE TABLE IF NOT EXISTS proxy_health (
  ip_port TEXT PRIMARY KEY,
  is_healthy INTEGER NOT NULL,
  latency_ms INTEGER,
  last_check INTEGER
);
`;
var CREATE_ADMIN_SESSION_TABLE = `
CREATE TABLE IF NOT EXISTS admin_session (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER
);
`;
export {
  CREATE_ADMIN_SESSION_TABLE,
  CREATE_PROXY_HEALTH_TABLE,
  CREATE_USERS_TABLE,
  CREATE_USER_IPS_TABLE
};
