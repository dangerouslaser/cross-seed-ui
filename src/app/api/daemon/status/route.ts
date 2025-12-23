import { NextResponse } from "next/server";
import { getDaemonStatus } from "@/lib/daemon";
import { parseConfig, configExists } from "@/lib/config/parser";

export async function GET() {
  const crossseedUrl = process.env.CROSSSEED_URL;
  const configPath = process.env.CROSSSEED_CONFIG_PATH;

  if (!crossseedUrl) {
    return NextResponse.json({
      running: false,
      error: "CROSSSEED_URL not configured",
      configured: false,
    });
  }

  // Try to get API key from config
  let apiKey: string | undefined;
  if (configPath && configExists(configPath)) {
    try {
      const config = parseConfig(configPath);
      apiKey = config.apiKey;
    } catch {
      // Config not readable, continue without API key
    }
  }

  const status = await getDaemonStatus(crossseedUrl, apiKey);

  return NextResponse.json({
    ...status,
    configured: true,
    url: crossseedUrl,
  });
}
