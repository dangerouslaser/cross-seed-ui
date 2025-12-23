import { NextRequest, NextResponse } from "next/server";
import { copyFileSync, unlinkSync, existsSync, statSync } from "fs";
import { dirname, join } from "path";
import { getConfigBackups, configExists } from "@/lib/config/parser";
import { getDb, schema } from "@/lib/db";

export async function GET() {
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!configPath) {
    return NextResponse.json(
      { error: "CROSSSEED_CONFIG_PATH not configured" },
      { status: 500 }
    );
  }

  try {
    const backupFiles = getConfigBackups(configPath);
    const configDir = dirname(configPath);

    const backups = backupFiles.map((filename) => {
      const filePath = join(configDir, filename);
      const stats = statSync(filePath);
      const timestampMatch = filename.match(/config\.js\.backup\.(\d+)/);
      const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : stats.mtimeMs;

      return {
        filename,
        createdAt: new Date(timestamp).toISOString(),
        size: stats.size,
      };
    });

    // Also get backup metadata from database
    const db = getDb();
    const dbBackups = db.select().from(schema.configBackups).all();
    const dbBackupMap = new Map(dbBackups.map((b) => [b.filename, b]));

    const enrichedBackups = backups.map((backup) => ({
      ...backup,
      reason: dbBackupMap.get(backup.filename)?.reason || "automatic",
    }));

    return NextResponse.json({ backups: enrichedBackups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!configPath) {
    return NextResponse.json(
      { error: "CROSSSEED_CONFIG_PATH not configured" },
      { status: 500 }
    );
  }

  if (!configExists(configPath)) {
    return NextResponse.json(
      { error: "Config file does not exist" },
      { status: 400 }
    );
  }

  let reason = "manual";
  try {
    const body = await request.json();
    reason = body.reason || "manual";
  } catch {
    // No body is fine
  }

  try {
    const configDir = dirname(configPath);
    const timestamp = Date.now();
    const backupFilename = `config.js.backup.${timestamp}`;
    const backupPath = join(configDir, backupFilename);

    copyFileSync(configPath, backupPath);

    // Record in database
    const db = getDb();
    db.insert(schema.configBackups)
      .values({
        filename: backupFilename,
        reason,
      })
      .run();

    return NextResponse.json({
      success: true,
      backup: {
        filename: backupFilename,
        createdAt: new Date(timestamp).toISOString(),
        reason,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create backup" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!configPath) {
    return NextResponse.json(
      { error: "CROSSSEED_CONFIG_PATH not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 }
    );
  }

  // Validate filename format to prevent path traversal
  if (!filename.match(/^config\.js\.backup\.\d+$/)) {
    return NextResponse.json(
      { error: "Invalid backup filename" },
      { status: 400 }
    );
  }

  try {
    const configDir = dirname(configPath);
    const backupPath = join(configDir, filename);

    if (!existsSync(backupPath)) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    unlinkSync(backupPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete backup" },
      { status: 500 }
    );
  }
}
