import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const testRequestSchema = z.object({
  type: z.enum(["torrent-client", "torznab", "sonarr", "radarr", "notification"]),
  url: z.string(),
});

// Detect client type from URL pattern
function detectClientType(url: string): "qbittorrent" | "rtorrent" | "transmission" | "deluge" | "unknown" {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("qbittorrent://") || lowerUrl.includes(":8080")) {
    return "qbittorrent";
  }
  if (lowerUrl.includes("rtorrent://") || lowerUrl.includes("/rtorrent") || lowerUrl.includes("/rutorrent") || lowerUrl.includes("/rpc") || lowerUrl.includes("/plugins/httprpc")) {
    return "rtorrent";
  }
  if (lowerUrl.includes("transmission://") || lowerUrl.includes(":9091") || lowerUrl.includes("/transmission")) {
    return "transmission";
  }
  if (lowerUrl.includes("deluge://") || lowerUrl.includes(":8112") || lowerUrl.includes("/json")) {
    return "deluge";
  }
  return "unknown";
}

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

async function testRTorrent(url: string): Promise<{ success: boolean; error?: string; version?: string }> {
  try {
    // Parse URL to extract credentials
    const parsed = new URL(url.replace("rtorrent://", "http://"));
    const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const username = parsed.username || "";
    const password = parsed.password || "";

    // rTorrent uses XML-RPC, send a simple system.listMethods request
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>system.client_version</methodName>
</methodCall>`;

    const headers: Record<string, string> = {
      "Content-Type": "text/xml",
    };

    if (username && password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: xmlRequest,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Authentication failed" };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const responseText = await response.text();

    // Extract version from XML response
    const versionMatch = responseText.match(/<value><string>([^<]+)<\/string><\/value>/);
    const version = versionMatch ? versionMatch[1] : undefined;

    return { success: true, version };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testTransmission(url: string): Promise<{ success: boolean; error?: string; version?: string }> {
  try {
    // Parse URL to extract credentials
    const parsed = new URL(url.replace("transmission://", "http://"));
    const baseUrl = `${parsed.protocol}//${parsed.host}`;
    const rpcPath = parsed.pathname || "/transmission/rpc";
    const username = parsed.username || "";
    const password = parsed.password || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (username && password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    }

    // Transmission requires a session ID, first request will fail with 409 and return the session ID
    let sessionId = "";

    const firstResponse = await fetch(`${baseUrl}${rpcPath}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ method: "session-get" }),
      signal: AbortSignal.timeout(10000),
    });

    if (firstResponse.status === 409) {
      sessionId = firstResponse.headers.get("x-transmission-session-id") || "";
    } else if (!firstResponse.ok) {
      if (firstResponse.status === 401) {
        return { success: false, error: "Authentication failed" };
      }
      return { success: false, error: `HTTP ${firstResponse.status}` };
    }

    // If we got a session ID, make the actual request
    if (sessionId) {
      headers["X-Transmission-Session-Id"] = sessionId;

      const response = await fetch(`${baseUrl}${rpcPath}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ method: "session-get" }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const version = data.arguments?.version;
      return { success: true, version };
    }

    // First request succeeded without 409
    const data = await firstResponse.json();
    const version = data.arguments?.version;
    return { success: true, version };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testDeluge(url: string): Promise<{ success: boolean; error?: string; version?: string }> {
  try {
    // Parse URL to extract credentials
    const parsed = new URL(url.replace("deluge://", "http://"));
    const baseUrl = `${parsed.protocol}//${parsed.host}`;
    const password = parsed.password || decodeURIComponent(parsed.pathname.slice(1)) || "";

    // Deluge Web API endpoint
    const jsonEndpoint = `${baseUrl}/json`;

    // First, authenticate
    const authResponse = await fetch(jsonEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "auth.login",
        params: [password],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!authResponse.ok) {
      return { success: false, error: `HTTP ${authResponse.status}` };
    }

    const authCookie = authResponse.headers.get("set-cookie");
    const authData = await authResponse.json();

    if (!authData.result) {
      return { success: false, error: "Authentication failed" };
    }

    // Get daemon info
    const infoResponse = await fetch(jsonEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authCookie ? { Cookie: authCookie } : {}),
      },
      body: JSON.stringify({
        method: "daemon.info",
        params: [],
        id: 2,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      return { success: true, version: infoData.result };
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
    case "torrent-client": {
      // Detect client type from URL
      const clientType = detectClientType(url);

      switch (clientType) {
        case "qbittorrent":
          testResult = await testQBittorrent(url.replace("qbittorrent://", "http://"));
          return NextResponse.json({ ...testResult, clientType: "qBittorrent" });

        case "rtorrent":
          testResult = await testRTorrent(url);
          return NextResponse.json({ ...testResult, clientType: "rTorrent" });

        case "transmission":
          testResult = await testTransmission(url);
          return NextResponse.json({ ...testResult, clientType: "Transmission" });

        case "deluge":
          testResult = await testDeluge(url);
          return NextResponse.json({ ...testResult, clientType: "Deluge" });

        default:
          // Try qBittorrent as default since it's the most common
          testResult = await testQBittorrent(url);
          if (testResult.success) {
            return NextResponse.json({ ...testResult, clientType: "qBittorrent" });
          }
          testResult = { success: false, error: "Could not detect client type. Please ensure the URL includes a recognizable pattern." };
      }
      break;
    }

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
