export interface DaemonStatus {
  running: boolean;
  version?: string;
  error?: string;
  lastCheck: Date;
}

export async function getDaemonStatus(
  crossseedUrl: string,
  apiKey?: string
): Promise<DaemonStatus> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Cross-seed doesn't have a dedicated health endpoint
    // We use the webhook endpoint with an empty POST - it will return 200 or 4xx
    // Any response (even 400/405) means the daemon is running
    const response = await fetch(`${crossseedUrl}/api/webhook`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Any response means cross-seed is running
    // 200 = success, 400 = bad request (but daemon is up), 401 = auth issue
    const version = response.headers.get("x-cross-seed-version");

    if (response.status === 401 || response.status === 403) {
      return {
        running: true,
        version: version || undefined,
        error: "API key invalid or missing",
        lastCheck: new Date(),
      };
    }

    return {
      running: true,
      version: version || undefined,
      lastCheck: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          running: false,
          error: "Connection timeout",
          lastCheck: new Date(),
        };
      }
      // Connection refused, network error, etc. = daemon not running
      return {
        running: false,
        error: error.message,
        lastCheck: new Date(),
      };
    }
    return {
      running: false,
      error: "Unknown error",
      lastCheck: new Date(),
    };
  }
}
