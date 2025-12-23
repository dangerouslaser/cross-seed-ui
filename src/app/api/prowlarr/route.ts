import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const prowlarrConfigSchema = z.object({
  url: z.string().url(),
  apiKey: z.string().min(1),
  syncEnabled: z.boolean().optional(),
  syncInterval: z.string().optional(),
});

export async function GET() {
  try {
    const db = getDb();
    const config = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    if (!config) {
      return NextResponse.json({
        configured: false,
      });
    }

    return NextResponse.json({
      configured: true,
      url: config.url,
      syncEnabled: config.syncEnabled,
      syncInterval: config.syncInterval,
      lastSync: config.lastSync,
      lastSyncStatus: config.lastSyncStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = prowlarrConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: result.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const { url, apiKey, syncEnabled, syncInterval } = result.data;

    // Check if config exists
    const existing = db
      .select()
      .from(schema.prowlarrConfig)
      .where(eq(schema.prowlarrConfig.id, 1))
      .get();

    // Encrypt API key (simple base64 for now, should use proper encryption)
    const apiKeyEncrypted = Buffer.from(apiKey);

    if (existing) {
      db.update(schema.prowlarrConfig)
        .set({
          url,
          apiKeyEncrypted,
          syncEnabled: syncEnabled ?? false,
          syncInterval: syncInterval ?? "1 hour",
          updatedAt: new Date(),
        })
        .where(eq(schema.prowlarrConfig.id, 1))
        .run();
    } else {
      db.insert(schema.prowlarrConfig)
        .values({
          id: 1,
          url,
          apiKeyEncrypted,
          syncEnabled: syncEnabled ?? false,
          syncInterval: syncInterval ?? "1 hour",
        })
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const db = getDb();
    db.delete(schema.prowlarrConfig).where(eq(schema.prowlarrConfig.id, 1)).run();
    db.delete(schema.prowlarrIndexers).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
