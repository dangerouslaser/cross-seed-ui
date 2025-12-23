import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const testRequestSchema = z.object({
  type: z.enum(["torrent-client", "torznab", "sonarr", "radarr", "notification"]),
  url: z.string(),
});

async function testQBittorrent(url: string): Promise<{ success: boolean; error?: string; version?: string }> {
  try {
    // Parse URL to extract credentials
    const parsed = new URL(url);
    const baseUrl = `${parsed.protocol}//${parsed.host}`;
    const username = parsed.username || "admin";
    const password = parsed.password || "";

    // Login
    const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
      signal: AbortSignal.timeout(10000),
    });

    if (!loginRes.ok) {
      return { success: false, error: "Authentication failed" };
    }

    const cookie = loginRes.headers.get("set-cookie");

    // Get version
    const versionRes = await fetch(`${baseUrl}/api/v2/app/version`, {
      headers: cookie ? { Cookie: cookie } : {},
      signal: AbortSignal.timeout(5000),
    });

    if (versionRes.ok) {
      const version = await versionRes.text();
      return { success: true, version };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testSonarrRadarr(url: string, type: "sonarr" | "radarr"): Promise<{ success: boolean; error?: string; version?: string }> {
  try {
    // Parse URL to get base and API key
    const [baseUrl, queryString] = url.split("?");
    const params = new URLSearchParams(queryString);
    const apiKey = params.get("apikey") || "";

    const response = await fetch(`${baseUrl}/api/v3/system/status`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid API key" };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, version: data.version };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testTorznab(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Add caps query to test the endpoint
    const testUrl = url.includes("?")
      ? `${url}&t=caps`
      : `${url}?t=caps`;

    const response = await fetch(testUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Invalid API key" };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    // Check if it returns XML (Torznab response)
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("xml")) {
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testNotification(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Send a simple test message
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "CrossSeed UI Test",
        message: "This is a test notification from CrossSeed UI",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = testRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { type, url } = result.data;

  let testResult: { success: boolean; error?: string; version?: string };

  switch (type) {
    case "torrent-client":
      // Detect client type from URL
      if (url.startsWith("qbittorrent://") || url.includes(":8080")) {
        testResult = await testQBittorrent(url.replace("qbittorrent://", "http://"));
        return NextResponse.json({ ...testResult, clientType: "qBittorrent" });
      }
      // TODO: Add support for other clients
      testResult = { success: false, error: "Unsupported client type" };
      break;

    case "torznab":
      testResult = await testTorznab(url);
      break;

    case "sonarr":
      testResult = await testSonarrRadarr(url, "sonarr");
      break;

    case "radarr":
      testResult = await testSonarrRadarr(url, "radarr");
      break;

    case "notification":
      testResult = await testNotification(url);
      break;

    default:
      testResult = { success: false, error: "Unknown connection type" };
  }

  return NextResponse.json(testResult);
}
