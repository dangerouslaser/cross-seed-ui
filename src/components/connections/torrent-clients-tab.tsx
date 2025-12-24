"use client";

import { useState } from "react";
import { Plus, Trash2, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CrossSeedConfig } from "@/types/config";
import { useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

interface TorrentClientsTabProps {
  config: CrossSeedConfig;
}

type ClientType = "qbittorrent" | "rtorrent" | "transmission" | "deluge";

interface ParsedClient {
  type: ClientType;
  url: string;
  username?: string;
  password?: string;
  raw: string;
}

function parseClientUrl(url: string): ParsedClient | null {
  try {
    const parsed = new URL(url);
    const type = parsed.protocol.replace(":", "") as ClientType;

    if (!["qbittorrent", "rtorrent", "transmission", "deluge"].includes(type)) {
      // Try to detect from URL path
      if (url.includes("qbittorrent") || url.includes(":8080")) {
        return {
          type: "qbittorrent",
          url: url,
          raw: url,
        };
      }
      return null;
    }

    return {
      type,
      url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      raw: url,
    };
  } catch {
    return null;
  }
}

function buildClientUrl(
  type: ClientType,
  host: string,
  port: string,
  username?: string,
  password?: string
): string {
  const auth = username && password ? `${username}:${password}@` : "";
  return `${type}://${auth}${host}:${port}`;
}

// Helper for torrent client entries (can be string URL or object)
type ClientEntry = string | { type?: string; baseUrl?: string; url?: string; [key: string]: unknown };

function getClientUrl(entry: ClientEntry): string {
  if (typeof entry === 'string') return entry;
  return entry.baseUrl || entry.url || '';
}

function getClientKey(entry: ClientEntry): string {
  return getClientUrl(entry);
}

function getClientTypeFromEntry(entry: ClientEntry): string {
  if (typeof entry === 'string') {
    return getClientTypeFromUrl(entry);
  }
  if (entry.type) return entry.type;
  const url = getClientUrl(entry);
  return getClientTypeFromUrl(url);
}

function getClientTypeFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(":", "");
    if (["qbittorrent", "rtorrent", "transmission", "deluge"].includes(protocol)) {
      return protocol;
    }
    // Fallback to detecting from URL
    if (url.includes("qbittorrent")) return "qBittorrent";
    if (url.includes("rtorrent")) return "rTorrent";
    if (url.includes("transmission")) return "Transmission";
    if (url.includes("deluge")) return "Deluge";
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

function getDisplayUrl(entry: ClientEntry): string {
  const url = getClientUrl(entry);
  return url.replace(/\/\/.*:.*@/, "//***:***@");
}

export function TorrentClientsTab({ config }: TorrentClientsTabProps) {
  const { updateConfig } = useConfigStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingClient, setTestingClient] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  // Form state for new client
  const [newClientType, setNewClientType] = useState<ClientType>("qbittorrent");
  const [newClientHost, setNewClientHost] = useState("");
  const [newClientPort, setNewClientPort] = useState("8080");
  const [newClientUsername, setNewClientUsername] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");

  const clients = (config.torrentClients || []) as ClientEntry[];

  const handleAddClient = async () => {
    if (!newClientHost) {
      toast.error("Host is required");
      return;
    }

    const clientUrl = buildClientUrl(
      newClientType,
      newClientHost,
      newClientPort,
      newClientUsername,
      newClientPassword
    );

    const newClients = [...clients, clientUrl];

    const result = await updateConfigPartial({ torrentClients: newClients });
    if (result.success) {
      updateConfig({ torrentClients: newClients });
      toast.success("Torrent client added");
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      toast.error(result.error || "Failed to add client");
    }
  };

  const handleRemoveClient = async (index: number) => {
    const newClients = clients.filter((_, i) => i !== index);

    const result = await updateConfigPartial({ torrentClients: newClients });
    if (result.success) {
      updateConfig({ torrentClients: newClients });
      toast.success("Torrent client removed");
    } else {
      toast.error(result.error || "Failed to remove client");
    }
  };

  const handleTestClient = async (clientUrl: string) => {
    setTestingClient(clientUrl);
    setTestResults((prev) => ({ ...prev, [clientUrl]: undefined as unknown as "success" | "error" }));

    try {
      const response = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "torrent-client", url: clientUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults((prev) => ({ ...prev, [clientUrl]: "success" }));
        toast.success(`Connected to ${data.clientType || "client"}`);
      } else {
        setTestResults((prev) => ({ ...prev, [clientUrl]: "error" }));
        toast.error(data.error || "Connection failed");
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [clientUrl]: "error" }));
      toast.error("Failed to test connection");
    } finally {
      setTestingClient(null);
    }
  };

  const resetForm = () => {
    setNewClientType("qbittorrent");
    setNewClientHost("");
    setNewClientPort("8080");
    setNewClientUsername("");
    setNewClientPassword("");
  };

  const getClientTypeFromUrl = (url: string): string => {
    if (url.startsWith("qbittorrent://")) return "qBittorrent";
    if (url.startsWith("rtorrent://")) return "rTorrent";
    if (url.startsWith("transmission://")) return "Transmission";
    if (url.startsWith("deluge://")) return "Deluge";
    return "Unknown";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Torrent Clients</CardTitle>
              <CardDescription>
                Configure your torrent client connections for cross-seed
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Torrent Client</DialogTitle>
                  <DialogDescription>
                    Configure a new torrent client connection
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Client Type</Label>
                    <Select
                      value={newClientType}
                      onValueChange={(v) => {
                        setNewClientType(v as ClientType);
                        // Set default port based on client type
                        const ports: Record<ClientType, string> = {
                          qbittorrent: "8080",
                          rtorrent: "8080",
                          transmission: "9091",
                          deluge: "8112",
                        };
                        setNewClientPort(ports[v as ClientType]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qbittorrent">qBittorrent</SelectItem>
                        <SelectItem value="rtorrent">rTorrent</SelectItem>
                        <SelectItem value="transmission">Transmission</SelectItem>
                        <SelectItem value="deluge">Deluge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Host</Label>
                      <Input
                        placeholder="localhost"
                        value={newClientHost}
                        onChange={(e) => setNewClientHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        placeholder="8080"
                        value={newClientPort}
                        onChange={(e) => setNewClientPort(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="Optional"
                      value={newClientUsername}
                      onChange={(e) => setNewClientUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Optional"
                      value={newClientPassword}
                      onChange={(e) => setNewClientPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddClient}>Add Client</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No torrent clients configured. Add one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((client, index) => {
                const key = getClientKey(client);
                const url = getClientUrl(client);
                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className="shrink-0">{getClientTypeFromEntry(client)}</Badge>
                      <span className="font-mono text-sm truncate">
                        {getDisplayUrl(client)}
                      </span>
                      {testResults[key] === "success" && (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      {testResults[key] === "error" && (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestClient(url)}
                        disabled={testingClient === url}
                      >
                        {testingClient === url ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                        <span className="ml-2">Test</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClient(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Settings</CardTitle>
          <CardDescription>
            Configure how cross-seed interacts with your torrent clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use Client Torrents</Label>
              <p className="text-sm text-muted-foreground">
                Use torrents from your client for matching (recommended)
              </p>
            </div>
            <Switch
              checked={config.useClientTorrents ?? true}
              onCheckedChange={async (checked) => {
                const result = await updateConfigPartial({ useClientTorrents: checked });
                if (result.success) {
                  updateConfig({ useClientTorrents: checked });
                  toast.success("Setting updated");
                } else {
                  toast.error("Failed to update setting");
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
