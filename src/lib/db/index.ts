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

// Singleton pattern for database connection
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const sqlite = new Database(getDbPath());
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
