import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getProwlarrIndexers, ProwlarrService } from "@/lib/services/prowlarr";

export async function GET() {
  try {
    const db = getDb();

    // Get Prowlarr config
    const config = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    if (!config || !config.url || !config.apiKeyEncrypted) {
      return NextResponse.json(
        { error: "Prowlarr not configured" },
        { status: 400 }
      );
    }

    const apiKey = config.apiKeyEncrypted.toString();

    // Fetch indexers from Prowlarr
    const prowlarrIndexers = await getProwlarrIndexers(config.url, apiKey);

    // Get saved indexer states from our database
    const savedIndexers = db.select().from(schema.prowlarrIndexers).all();
    const savedIndexerMap = new Map(
      savedIndexers.map((i) => [i.prowlarrId, i])
    );

    // Merge Prowlarr data with our saved states
    const indexers = prowlarrIndexers.map((pi) => {
      const saved = savedIndexerMap.get(pi.id);
      return {
        id: pi.id,
        name: pi.name,
        protocol: pi.protocol,
        privacy: pi.privacy,
        priority: pi.priority,
        definitionName: pi.definitionName,
        enabledForCrossseed: saved?.enabledForCrossseed ?? false,
        lastStatus: saved?.lastStatus ?? null,
      };
    });

    return NextResponse.json({
      indexers,
      prowlarrUrl: config.url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch indexers" },
      { status: 500 }
    );
  }
}
