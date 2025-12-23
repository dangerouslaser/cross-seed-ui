import { NextRequest, NextResponse } from "next/server";
import { parseConfig, writeConfig, configExists } from "@/lib/config/parser";
import { CrossSeedConfigSchema, CrossSeedConfigUpdateSchema } from "@/types/config";

export async function GET() {
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!configPath) {
    return NextResponse.json(
      { error: "CROSSSEED_CONFIG_PATH not configured" },
      { status: 500 }
    );
  }

  if (!configExists(configPath)) {
    return NextResponse.json(
      { error: "Config file not found", exists: false },
      { status: 404 }
    );
  }

  try {
    const config = parseConfig(configPath);
    return NextResponse.json({
      config,
      exists: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to parse config",
        exists: true,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Validate the full config
  const result = CrossSeedConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: result.error.flatten() },
      { status: 400 }
    );
  }

  try {
    writeConfig(configPath, result.data);
    return NextResponse.json({
      success: true,
      config: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write config" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!configPath) {
    return NextResponse.json(
      { error: "CROSSSEED_CONFIG_PATH not configured" },
      { status: 500 }
    );
  }

  if (!configExists(configPath)) {
    return NextResponse.json(
      { error: "Config file not found" },
      { status: 404 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Validate the partial config
  const result = CrossSeedConfigUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: result.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Get current config and merge with updates
    const currentConfig = parseConfig(configPath);
    const newConfig = { ...currentConfig, ...result.data };

    writeConfig(configPath, newConfig);
    return NextResponse.json({
      success: true,
      config: newConfig,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update config" },
      { status: 500 }
    );
  }
}
