import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ProwlarrService } from "./prowlarr";
import { parseConfig, writeConfig } from "@/lib/config/parser";

// Parse interval strings like "15 minutes", "1 hour", "6 hours", "1 day"
function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)\s*(minute|minutes|hour|hours|day|days)$/i);
  if (!match) {
    return 60 * 60 * 1000; // Default: 1 hour
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "minute":
    case "minutes":
      return value * 60 * 1000;
    case "hour":
    case "hours":
      return value * 60 * 60 * 1000;
    case "day":
    case "days":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

async function runProwlarrSync(): Promise<void> {
  console.log("[Scheduler] Checking Prowlarr sync schedule...");

  try {
    const db = getDb();

    // Get Prowlarr config
    const prowlarrConfig = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    if (!prowlarrConfig) {
      console.log("[Scheduler] No Prowlarr configuration found");
      return;
    }

    if (!prowlarrConfig.syncEnabled) {
      console.log("[Scheduler] Prowlarr sync is disabled");
      return;
    }

    if (!prowlarrConfig.url || !prowlarrConfig.apiKeyEncrypted) {
      console.log("[Scheduler] Prowlarr not fully configured");
      return;
    }

    // Check if enough time has passed since last sync
    const intervalMs = parseInterval(prowlarrConfig.syncInterval || "1 hour");
    const lastSync = prowlarrConfig.lastSync ? new Date(prowlarrConfig.lastSync).getTime() : 0;
    const now = Date.now();

    if (lastSync > 0 && now - lastSync < intervalMs) {
      const nextSyncIn = Math.round((lastSync + intervalMs - now) / 1000 / 60);
      console.log(`[Scheduler] Next Prowlarr sync in ${nextSyncIn} minutes`);
      return;
    }

    console.log("[Scheduler] Running scheduled Prowlarr sync...");

    const apiKey = prowlarrConfig.apiKeyEncrypted.toString();
    const prowlarrService = new ProwlarrService(prowlarrConfig.url, apiKey);

    // Get indexers from Prowlarr
    const indexers = await prowlarrService.getIndexers();

    // Get previously enabled indexers from our database
    const savedIndexers = db.select().from(schema.prowlarrIndexers).all();
    const enabledIds = savedIndexers
      .filter((i) => i.enabledForCrossseed)
      .map((i) => i.prowlarrId);

    if (enabledIds.length === 0) {
      console.log("[Scheduler] No indexers enabled for sync");

      // Update last sync timestamp even if no indexers
      db.update(schema.prowlarrConfig)
        .set({
          lastSync: new Date(),
          lastSyncStatus: "success",
        })
        .where(eq(schema.prowlarrConfig.id, 1))
        .run();
      return;
    }

    // Generate Torznab URLs
    const torznabUrls = prowlarrService.generateTorznabUrls(enabledIds);

    // Get cross-seed config path
    const configPath = process.env.CROSSSEED_CONFIG_PATH;
    if (!configPath) {
      console.error("[Scheduler] CROSSSEED_CONFIG_PATH not configured");
      return;
    }

    // Read current config
    const config = parseConfig(configPath);

    // Get existing manual indexers (not from Prowlarr)
    const prowlarrUrlPattern = new RegExp(
      `^${prowlarrConfig.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\d+/api`
    );
    const manualIndexers = (config.torznab || []).filter((entry) => {
      // Handle both string URLs and object entries
      const url = typeof entry === 'string' ? entry : entry.url;
      return !prowlarrUrlPattern.test(url);
    });

    // Combine manual indexers with new Prowlarr URLs
    const newTorznab = [...manualIndexers, ...torznabUrls];

    // Update config
    writeConfig(configPath, { ...config, torznab: newTorznab });

    // Update indexer states in our database
    for (const indexer of indexers) {
      const enabled = enabledIds.includes(indexer.id);

      const existing = db
        .select()
        .from(schema.prowlarrIndexers)
        .where(eq(schema.prowlarrIndexers.prowlarrId, indexer.id))
        .get();

      if (existing) {
        db.update(schema.prowlarrIndexers)
          .set({
            name: indexer.name,
            enabledForCrossseed: enabled,
            updatedAt: new Date(),
          })
          .where(eq(schema.prowlarrIndexers.prowlarrId, indexer.id))
          .run();
      } else {
        db.insert(schema.prowlarrIndexers)
          .values({
            prowlarrId: indexer.id,
            name: indexer.name,
            enabledForCrossseed: enabled,
          })
          .run();
      }
    }

    // Update last sync timestamp
    db.update(schema.prowlarrConfig)
      .set({
        lastSync: new Date(),
        lastSyncStatus: "success",
      })
      .where(eq(schema.prowlarrConfig.id, 1))
      .run();

    // Log sync history
    db.insert(schema.prowlarrSyncHistory)
      .values({
        syncType: "scheduled",
        status: "success",
        indexersAdded: enabledIds.length,
        indexersUpdated: 0,
        indexersRemoved: 0,
      })
      .run();

    console.log(`[Scheduler] Prowlarr sync complete. Synced ${enabledIds.length} indexers.`);
  } catch (error) {
    console.error("[Scheduler] Prowlarr sync failed:", error);

    // Log sync failure
    try {
      const db = getDb();
      db.update(schema.prowlarrConfig)
        .set({
          lastSync: new Date(),
          lastSyncStatus: "error",
        })
        .where(eq(schema.prowlarrConfig.id, 1))
        .run();

      db.insert(schema.prowlarrSyncHistory)
        .values({
          syncType: "scheduled",
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .run();
    } catch {
      // Ignore logging errors
    }
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (schedulerInterval) {
    console.log("[Scheduler] Scheduler already running");
    return;
  }

  console.log("[Scheduler] Starting background scheduler...");

  // Run immediately on start
  runProwlarrSync().catch(console.error);

  // Then run every minute to check schedules
  schedulerInterval = setInterval(() => {
    runProwlarrSync().catch(console.error);
  }, 60 * 1000);

  console.log("[Scheduler] Scheduler started");
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Scheduler stopped");
  }
}

export function getNextSyncTime(): Date | null {
  try {
    const db = getDb();
    const prowlarrConfig = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    if (!prowlarrConfig || !prowlarrConfig.syncEnabled) {
      return null;
    }

    const intervalMs = parseInterval(prowlarrConfig.syncInterval || "1 hour");
    const lastSync = prowlarrConfig.lastSync
      ? new Date(prowlarrConfig.lastSync).getTime()
      : 0;

    if (lastSync === 0) {
      return new Date(); // Next sync will be now
    }

    return new Date(lastSync + intervalMs);
  } catch {
    return null;
  }
}
