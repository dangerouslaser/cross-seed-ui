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
    const headers: HeadersInit = {};
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${crossseedUrl}/api/health`, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const version = response.headers.get("x-cross-seed-version");
      return {
        running: true,
        version: version || undefined,
        lastCheck: new Date(),
      };
    }

    return {
      running: false,
      error: `Unhealthy response: ${response.status}`,
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
