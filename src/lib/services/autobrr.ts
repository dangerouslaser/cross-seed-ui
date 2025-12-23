export interface AutobrrConfig {
  configured: boolean;
  url?: string;
  version?: string;
  webhookUrl?: string;
}

export interface AutobrrFilter {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  indexers: string[];
  actions: AutobrrAction[];
}

export interface AutobrrAction {
  name: string;
  type: string;
  enabled: boolean;
  webhook_host?: string;
  webhook_data?: string;
}

export async function testAutobrrConnection(
  url: string,
  apiKey: string
): Promise<{ success: boolean; version?: string; error?: string }> {
  try {
    // Normalize URL
    const baseUrl = url.replace(/\/+$/, "");

    const response = await fetch(`${baseUrl}/api/healthz/liveness`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Invalid API key" };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    // Try to get version info
    let version: string | undefined;
    try {
      const configResponse = await fetch(`${baseUrl}/api/config`, {
        headers: { "X-Api-Key": apiKey },
      });
      if (configResponse.ok) {
        const configData = await configResponse.json();
        version = configData.version;
      }
    } catch {
      // Version fetch is optional
    }

    return { success: true, version };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function getAutobrrFilters(
  url: string,
  apiKey: string
): Promise<AutobrrFilter[]> {
  const baseUrl = url.replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/api/filters`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch filters: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data || [];
}

export function generateCrossSeedWebhookAction(
  crossSeedUrl: string,
  crossSeedApiKey: string
): { webhookHost: string; webhookData: string } {
  // Generate the webhook configuration for autobrr to call cross-seed
  const webhookHost = `${crossSeedUrl}/api/announce`;

  // The webhook data template using autobrr's template variables
  const webhookData = JSON.stringify({
    name: "{{ .TorrentName }}",
    guid: "{{ .TorrentUrl }}",
    link: "{{ .TorrentUrl }}",
    tracker: "{{ .IndexerName }}",
  });

  return { webhookHost, webhookData };
}

export function generateFilterActionJson(
  crossSeedUrl: string,
  crossSeedApiKey: string
): string {
  const { webhookHost, webhookData } = generateCrossSeedWebhookAction(
    crossSeedUrl,
    crossSeedApiKey
  );

  // Generate a complete action configuration that can be imported into autobrr
  const actionConfig = {
    name: "cross-seed announce",
    type: "WEBHOOK",
    enabled: true,
    webhook_host: webhookHost,
    webhook_type: "JSON",
    webhook_method: "POST",
    webhook_data: webhookData,
    webhook_headers: [
      {
        key: "X-Api-Key",
        value: crossSeedApiKey,
      },
    ],
  };

  return JSON.stringify(actionConfig, null, 2);
}

export class AutobrrService {
  private url: string;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.url = url.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    return testAutobrrConnection(this.url, this.apiKey);
  }

  async getFilters(): Promise<AutobrrFilter[]> {
    return getAutobrrFilters(this.url, this.apiKey);
  }

  getWebhookConfig(crossSeedUrl: string, crossSeedApiKey: string) {
    return generateCrossSeedWebhookAction(crossSeedUrl, crossSeedApiKey);
  }

  getActionJson(crossSeedUrl: string, crossSeedApiKey: string): string {
    return generateFilterActionJson(crossSeedUrl, crossSeedApiKey);
  }
}
