// Lightweight schema module: export SQL statements to create tables
// and TypeScript interfaces. This avoids runtime dependency on Drizzle ORM

export const CREATE_USERS_TABLE = `
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

export const CREATE_USER_IPS_TABLE = `
CREATE TABLE IF NOT EXISTS user_ips (
  uuid TEXT,
  ip TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uuid, ip)
);
`;

export const CREATE_PROXY_HEALTH_TABLE = `
CREATE TABLE IF NOT EXISTS proxy_health (
  ip_port TEXT PRIMARY KEY,
  is_healthy INTEGER NOT NULL,
  latency_ms INTEGER,
  last_check INTEGER
);
`;

export const CREATE_ADMIN_SESSION_TABLE = `
CREATE TABLE IF NOT EXISTS admin_session (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER
);
`;

export interface UserRow {
  uuid: string;
  created_at?: string;
  expiration_date: string;
  expiration_time: string;
  notes?: string | null;
  traffic_limit?: number | null;
  traffic_used?: number | null;
  ip_limit?: number | null;
}

