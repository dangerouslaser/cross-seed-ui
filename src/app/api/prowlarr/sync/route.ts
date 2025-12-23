import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ProwlarrService } from "@/lib/services/prowlarr";
import { parseConfig, writeConfig } from "@/lib/config/parser";

const syncSchema = z.object({
  indexerIds: z.array(z.number()),
});

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = syncSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { indexerIds } = result.data;

  try {
    const db = getDb();

    // Get Prowlarr config
    const prowlarrConfig = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    if (!prowlarrConfig || !prowlarrConfig.url || !prowlarrConfig.apiKeyEncrypted) {
      return NextResponse.json(
        { error: "Prowlarr not configured" },
        { status: 400 }
      );
    }

    const apiKey = prowlarrConfig.apiKeyEncrypted.toString();
    const prowlarrService = new ProwlarrService(prowlarrConfig.url, apiKey);

    // Generate Torznab URLs for selected indexers
    const torznabUrls = prowlarrService.generateTorznabUrls(indexerIds);

    // Get cross-seed config path
    const configPath = process.env.CROSSSEED_CONFIG_PATH;
    if (!configPath) {
      return NextResponse.json(
        { error: "CROSSSEED_CONFIG_PATH not configured" },
        { status: 500 }
      );
    }

    // Read current config
    const config = parseConfig(configPath);

    // Get existing manual indexers (not from Prowlarr)
    const prowlarrUrlPattern = new RegExp(`^${prowlarrConfig.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/api`);
    const manualIndexers = (config.torznab || []).filter(
      (url) => !prowlarrUrlPattern.test(url)
    );

    // Combine manual indexers with new Prowlarr URLs
    const newTorznab = [...manualIndexers, ...torznabUrls];

    // Update config
    writeConfig(configPath, { ...config, torznab: newTorznab });

    // Update indexer states in our database
    const indexers = await prowlarrService.getIndexers();
    for (const indexer of indexers) {
      const enabled = indexerIds.includes(indexer.id);

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
        syncType: "manual",
        status: "success",
        indexersAdded: indexerIds.length,
        indexersUpdated: 0,
        indexersRemoved: 0,
      })
      .run();

    return NextResponse.json({
      success: true,
      synced: indexerIds.length,
      torznabUrls,
    });
  } catch (error) {
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
          syncType: "manual",
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .run();
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
