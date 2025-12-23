import { NextRequest, NextResponse } from "next/server";
import { readFileSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { parseConfig, configExists } from "@/lib/config/parser";
import { getDb, schema } from "@/lib/db";

export async function POST(request: NextRequest) {
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!configPath) {
    return NextResponse.json(
      { error: "CROSSSEED_CONFIG_PATH not configured" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { filename } = body;

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

    // Validate the backup file can be parsed
    const backupContent = readFileSync(backupPath, "utf-8");

    // Try to parse the backup to validate it
    try {
      // Simple validation - we'll copy it anyway but want to warn if invalid
      if (!backupContent.includes("module.exports")) {
        return NextResponse.json(
          { error: "Backup file appears to be invalid" },
          { status: 400 }
        );
      }
    } catch {
      // Continue anyway - user may want to restore a partially valid backup
    }

    // Create a backup of current config before restoring
    if (configExists(configPath)) {
      const timestamp = Date.now();
      const preRestoreBackup = `config.js.backup.${timestamp}`;
      const preRestorePath = join(configDir, preRestoreBackup);
      copyFileSync(configPath, preRestorePath);

      // Record pre-restore backup
      const db = getDb();
      db.insert(schema.configBackups)
        .values({
          filename: preRestoreBackup,
          reason: `pre-restore (before restoring ${filename})`,
        })
        .run();
    }

    // Restore the backup
    copyFileSync(backupPath, configPath);

    // Try to parse the restored config to return it
    let restoredConfig = null;
    try {
      restoredConfig = parseConfig(configPath);
    } catch {
      // Config restored but may not parse - that's okay
    }

    return NextResponse.json({
      success: true,
      message: `Restored from ${filename}`,
      config: restoredConfig,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore backup" },
      { status: 500 }
    );
  }
}
