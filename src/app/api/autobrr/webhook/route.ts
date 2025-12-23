import { NextResponse } from "next/server";
import { generateFilterActionJson } from "@/lib/services/autobrr";
import { parseConfig } from "@/lib/config/parser";

export async function GET() {
  try {
    const configPath = process.env.CROSSSEED_CONFIG_PATH;
    if (!configPath) {
      return NextResponse.json(
        { error: "CROSSSEED_CONFIG_PATH not configured" },
        { status: 500 }
      );
    }

    const config = parseConfig(configPath);

    // Get the cross-seed URL from config or environment
    const host = config.host || "localhost";
    const port = config.port || 2468;
    const apiKey = config.apiKey || "";

    // Construct the cross-seed base URL
    const crossSeedUrl = `http://${host}:${port}`;

    // Generate the webhook action JSON
    const actionJson = generateFilterActionJson(crossSeedUrl, apiKey);

    // Also provide individual components for display
    const webhookUrl = `${crossSeedUrl}/api/announce`;

    return NextResponse.json({
      crossSeedUrl,
      webhookUrl,
      apiKey,
      actionJson,
      webhookData: JSON.stringify({
        name: "{{ .TorrentName }}",
        guid: "{{ .TorrentUrl }}",
        link: "{{ .TorrentUrl }}",
        tracker: "{{ .IndexerName }}",
      }, null, 2),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate webhook config" },
      { status: 500 }
    );
  }
}
