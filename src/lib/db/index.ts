import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

function getDbPath(): string {
  // Use environment variable or default
  const dbPath = process.env.DATABASE_PATH || "./data/ui.db";

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dbPath;
}

function initializeTables(sqlite: Database.Database): void {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER,
      last_login INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      expires_at INTEGER NOT NULL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS prowlarr_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      url TEXT,
      api_key_encrypted BLOB,
      sync_enabled INTEGER DEFAULT 0,
      sync_interval TEXT DEFAULT '1 hour',
      last_sync INTEGER,
      last_sync_status TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS prowlarr_indexers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prowlarr_id INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      enabled_for_crossseed INTEGER DEFAULT 0,
      last_status TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS prowlarr_sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      indexers_added INTEGER DEFAULT 0,
      indexers_updated INTEGER DEFAULT 0,
      indexers_removed INTEGER DEFAULT 0,
      error_message TEXT,
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS connection_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_type TEXT NOT NULL,
      service_id TEXT,
      success INTEGER NOT NULL,
      message TEXT,
      response_time_ms INTEGER,
      tested_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS config_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ui_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS autobrr_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      url TEXT,
      api_key_encrypted BLOB,
      updated_at INTEGER
    );
  `);
}

// Singleton pattern for database connection
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const sqlite = new Database(getDbPath());
    sqlite.pragma("journal_mode = WAL");

    // Auto-create tables on first connection
    initializeTables(sqlite);

    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
