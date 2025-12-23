import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();

    const config = db
      .select()
      .from(schema.autobrrConfig)
      .where(eq(schema.autobrrConfig.id, 1))
      .get();

    if (!config || !config.url) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({
      configured: true,
      url: config.url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load config" },
      { status: 500 }
    );
  }
}

const configSchema = z.object({
  url: z.string().url(),
  apiKey: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = configSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { url, apiKey } = result.data;

  try {
    const db = getDb();

    // Check if config exists
    const existing = db
      .select()
      .from(schema.autobrrConfig)
      .where(eq(schema.autobrrConfig.id, 1))
      .get();

    // Store API key as blob (in production, encrypt this)
    const apiKeyBlob = Buffer.from(apiKey);

    if (existing) {
      db.update(schema.autobrrConfig)
        .set({
          url,
          apiKeyEncrypted: apiKeyBlob,
          updatedAt: new Date(),
        })
        .where(eq(schema.autobrrConfig.id, 1))
        .run();
    } else {
      db.insert(schema.autobrrConfig)
        .values({
          id: 1,
          url,
          apiKeyEncrypted: apiKeyBlob,
        })
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save config" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const db = getDb();

    db.delete(schema.autobrrConfig)
      .where(eq(schema.autobrrConfig.id, 1))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete config" },
      { status: 500 }
    );
  }
}
