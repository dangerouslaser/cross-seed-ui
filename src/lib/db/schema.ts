import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

// User authentication
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
  lastLogin: integer("last_login", { mode: "timestamp" }),
});

// Active sessions
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

// Prowlarr configuration
export const prowlarrConfig = sqliteTable("prowlarr_config", {
  id: integer("id").primaryKey().default(1),
  url: text("url"),
  apiKeyEncrypted: blob("api_key_encrypted"),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).default(false),
  syncInterval: text("sync_interval").default("1 hour"),
  lastSync: integer("last_sync", { mode: "timestamp" }),
  lastSyncStatus: text("last_sync_status"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

// Prowlarr indexer state
export const prowlarrIndexers = sqliteTable("prowlarr_indexers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prowlarrId: integer("prowlarr_id").unique().notNull(),
  name: text("name").notNull(),
  enabledForCrossseed: integer("enabled_for_crossseed", { mode: "boolean" }).default(false),
  lastStatus: text("last_status"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

// Prowlarr sync history
export const prowlarrSyncHistory = sqliteTable("prowlarr_sync_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull(),
  indexersAdded: integer("indexers_added").default(0),
  indexersUpdated: integer("indexers_updated").default(0),
  indexersRemoved: integer("indexers_removed").default(0),
  errorMessage: text("error_message"),
  syncedAt: integer("synced_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

// Connection test history
export const connectionTests = sqliteTable("connection_tests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceType: text("service_type").notNull(),
  serviceId: text("service_id"),
  success: integer("success", { mode: "boolean" }).notNull(),
  message: text("message"),
  responseTimeMs: integer("response_time_ms"),
  testedAt: integer("tested_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

// Config backup metadata
export const configBackups = sqliteTable("config_backups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

// UI settings
export const uiSettings = sqliteTable("ui_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});
