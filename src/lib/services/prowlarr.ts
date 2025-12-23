export interface ProwlarrIndexer {
  id: number;
  name: string;
  protocol: string;
  privacy: string;
  priority: number;
  enable: boolean;
  appProfileId: number;
  definitionName: string;
  capabilities: {
    categories: Array<{ id: number; name: string }>;
  };
}

export interface ProwlarrStatus {
  version: string;
  instanceName?: string;
}

export class ProwlarrService {
  private url: string;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.url = url.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key");
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const status = await this.fetch<ProwlarrStatus>("/api/v1/system/status");
      return {
        success: true,
        version: status.version,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async getIndexers(): Promise<ProwlarrIndexer[]> {
    const indexers = await this.fetch<ProwlarrIndexer[]>("/api/v1/indexer");
    // Filter to only torrent indexers that are enabled
    return indexers.filter((i) => i.protocol === "torrent" && i.enable);
  }

  async testIndexer(indexerId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetch(`/api/v1/indexer/test`, {
        method: "POST",
        body: JSON.stringify({ id: indexerId }),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      };
    }
  }

  getTorznabUrl(indexerId: number): string {
    return `${this.url}/${indexerId}/api?apikey=${this.apiKey}`;
  }

  generateTorznabUrls(indexerIds: number[]): string[] {
    return indexerIds.map((id) => this.getTorznabUrl(id));
  }
}

export async function testProwlarrConnection(
  url: string,
  apiKey: string
): Promise<{ success: boolean; version?: string; error?: string }> {
  const service = new ProwlarrService(url, apiKey);
  return service.testConnection();
}

export async function getProwlarrIndexers(
  url: string,
  apiKey: string
): Promise<ProwlarrIndexer[]> {
  const service = new ProwlarrService(url, apiKey);
  return service.getIndexers();
}
