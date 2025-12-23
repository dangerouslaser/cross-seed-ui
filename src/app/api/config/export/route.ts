import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { configExists } from "@/lib/config/parser";

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
      { error: "Config file does not exist" },
      { status: 404 }
    );
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `config-${timestamp}.js`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export config" },
      { status: 500 }
    );
  }
}
