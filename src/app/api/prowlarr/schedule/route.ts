import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

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

export async function GET() {
  try {
    const db = getDb();

    // Get Prowlarr config
    const prowlarrConfig = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    if (!prowlarrConfig || !prowlarrConfig.syncEnabled) {
      return NextResponse.json({
        enabled: false,
        nextSync: null,
        lastSync: null,
        lastSyncStatus: null,
        history: [],
      });
    }

    const intervalMs = parseInterval(prowlarrConfig.syncInterval || "1 hour");
    const lastSync = prowlarrConfig.lastSync
      ? new Date(prowlarrConfig.lastSync).getTime()
      : null;

    let nextSync: string | null = null;
    if (lastSync) {
      nextSync = new Date(lastSync + intervalMs).toISOString();
    } else {
      nextSync = new Date().toISOString();
    }

    // Get sync history
    const history = db
      .select()
      .from(schema.prowlarrSyncHistory)
      .orderBy(desc(schema.prowlarrSyncHistory.syncedAt))
      .limit(10)
      .all();

    return NextResponse.json({
      enabled: true,
      interval: prowlarrConfig.syncInterval,
      nextSync,
      lastSync: prowlarrConfig.lastSync ? new Date(prowlarrConfig.lastSync).toISOString() : null,
      lastSyncStatus: prowlarrConfig.lastSyncStatus,
      history: history.map((h) => ({
        id: h.id,
        type: h.syncType,
        status: h.status,
        indexersAdded: h.indexersAdded,
        indexersUpdated: h.indexersUpdated,
        indexersRemoved: h.indexersRemoved,
        error: h.errorMessage,
        timestamp: h.syncedAt ? new Date(h.syncedAt).toISOString() : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get schedule info" },
      { status: 500 }
    );
  }
}
