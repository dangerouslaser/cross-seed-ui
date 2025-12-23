"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  Settings,
  Trash2,
  Clock,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface ProwlarrConfig {
  configured: boolean;
  url?: string;
  syncEnabled?: boolean;
  syncInterval?: string;
  lastSync?: string;
  lastSyncStatus?: string;
}

interface ProwlarrIndexer {
  id: number;
  name: string;
  protocol: string;
  privacy: string;
  priority: number;
  definitionName: string;
  enabledForCrossseed: boolean;
  lastStatus: string | null;
}

interface SyncHistoryEntry {
  id: number;
  type: string;
  status: string;
  indexersAdded: number;
  indexersUpdated: number;
  indexersRemoved: number;
  error: string | null;
  timestamp: string | null;
}

interface ScheduleInfo {
  enabled: boolean;
  interval?: string;
  nextSync: string | null;
  lastSync: string | null;
  lastSyncStatus: string | null;
  history: SyncHistoryEntry[];
}

export function ProwlarrTab() {
  const [config, setConfig] = useState<ProwlarrConfig | null>(null);
  const [indexers, setIndexers] = useState<ProwlarrIndexer[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [selectedIndexers, setSelectedIndexers] = useState<Set<number>>(new Set());

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formSyncEnabled, setFormSyncEnabled] = useState(false);
  const [formSyncInterval, setFormSyncInterval] = useState("1 hour");

  const loadScheduleInfo = async () => {
    try {
      const response = await fetch("/api/prowlarr/schedule");
      if (response.ok) {
        const data = await response.json();
        setScheduleInfo(data);
      }
    } catch (error) {
      console.error("Failed to load schedule info:", error);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/prowlarr");
      const data = await response.json();
      setConfig(data);

      if (data.configured) {
        setFormUrl(data.url || "");
        setFormSyncEnabled(data.syncEnabled || false);
        setFormSyncInterval(data.syncInterval || "1 hour");
        await Promise.all([loadIndexers(), loadScheduleInfo()]);
      }
    } catch (error) {
      console.error("Failed to load Prowlarr config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIndexers = async () => {
    try {
      const response = await fetch("/api/prowlarr/indexers");
      if (response.ok) {
        const data = await response.json();
        setIndexers(data.indexers || []);

        // Pre-select enabled indexers
        const enabled = new Set<number>(
          data.indexers
            .filter((i: ProwlarrIndexer) => i.enabledForCrossseed)
            .map((i: ProwlarrIndexer) => i.id)
        );
        setSelectedIndexers(enabled);
      }
    } catch (error) {
      console.error("Failed to load indexers:", error);
    }
  };

  const handleTest = async () => {
    if (!formUrl || !formApiKey) {
      toast.error("URL and API key are required");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/prowlarr/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, apiKey: formApiKey }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult("success");
        toast.success(`Connected to Prowlarr ${data.version || ""}`);
      } else {
        setTestResult("error");
        toast.error(data.error || "Connection failed");
      }
    } catch {
      setTestResult("error");
      toast.error("Failed to test connection");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!formUrl || !formApiKey) {
      toast.error("URL and API key are required");
      return;
    }

    try {
      const response = await fetch("/api/prowlarr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          apiKey: formApiKey,
          syncEnabled: formSyncEnabled,
          syncInterval: formSyncInterval,
        }),
      });

      if (response.ok) {
        toast.success("Prowlarr configuration saved");
        setIsConfigDialogOpen(false);
        await loadConfig();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save configuration");
      }
    } catch {
      toast.error("Failed to save configuration");
    }
  };

  const handleRemoveConfig = async () => {
    try {
      const response = await fetch("/api/prowlarr", { method: "DELETE" });
      if (response.ok) {
        toast.success("Prowlarr configuration removed");
        setConfig({ configured: false });
        setIndexers([]);
        setFormUrl("");
        setFormApiKey("");
      }
    } catch {
      toast.error("Failed to remove configuration");
    }
  };

  const handleSync = async () => {
    if (selectedIndexers.size === 0) {
      toast.error("Select at least one indexer to sync");
      return;
    }

    setIsSyncing(true);

    try {
      const response = await fetch("/api/prowlarr/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexerIds: Array.from(selectedIndexers) }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Synced ${data.synced} indexers to cross-seed`);
        await loadConfig();
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch {
      toast.error("Failed to sync indexers");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleIndexer = (id: number) => {
    setSelectedIndexers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllPrivate = () => {
    const privateIds = indexers
      .filter((i) => i.privacy === "private")
      .map((i) => i.id);
    setSelectedIndexers(new Set(privateIds));
  };

  const selectAll = () => {
    setSelectedIndexers(new Set(indexers.map((i) => i.id)));
  };

  const selectNone = () => {
    setSelectedIndexers(new Set());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Prowlarr Integration</CardTitle>
              <CardDescription>
                Automatically sync indexers from Prowlarr to cross-seed
              </CardDescription>
            </div>
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button variant={config?.configured ? "outline" : "default"}>
                  <Settings className="mr-2 h-4 w-4" />
                  {config?.configured ? "Settings" : "Configure"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Prowlarr Configuration</DialogTitle>
                  <DialogDescription>
                    Connect to your Prowlarr instance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Prowlarr URL</Label>
                    <Input
                      placeholder="http://localhost:9696"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter API key"
                      value={formApiKey}
                      onChange={(e) => setFormApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in Prowlarr → Settings → General
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    {testResult === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {testResult === "error" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync indexers on a schedule
                        </p>
                      </div>
                      <Switch
                        checked={formSyncEnabled}
                        onCheckedChange={setFormSyncEnabled}
                      />
                    </div>

                    {formSyncEnabled && (
                      <div className="space-y-2">
                        <Label>Sync Interval</Label>
                        <Select
                          value={formSyncInterval}
                          onValueChange={setFormSyncInterval}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15 minutes">15 minutes</SelectItem>
                            <SelectItem value="30 minutes">30 minutes</SelectItem>
                            <SelectItem value="1 hour">1 hour</SelectItem>
                            <SelectItem value="6 hours">6 hours</SelectItem>
                            <SelectItem value="1 day">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="flex justify-between">
                  {config?.configured && (
                    <Button variant="destructive" onClick={handleRemoveConfig}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsConfigDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveConfig}>Save</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        {config?.configured && (
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Connected
              </Badge>
              {config.lastSync && (
                <span className="text-muted-foreground">
                  Last sync: {new Date(config.lastSync).toLocaleString()}
                </span>
              )}
              {config.syncEnabled && (
                <Badge variant="secondary">
                  Auto-sync: {config.syncInterval}
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {config?.configured && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Indexers</CardTitle>
                  <CardDescription>
                    Select indexers to sync with cross-seed
                  </CardDescription>
                </div>
                <Button onClick={handleSync} disabled={isSyncing} className="w-fit">
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync to Cross-Seed
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllPrivate}>
                  Select Private
                </Button>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Clear
                </Button>
                <Button variant="outline" size="sm" onClick={loadIndexers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {indexers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No indexers found. Make sure Prowlarr has indexers configured.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <div className="inline-block min-w-full px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="whitespace-nowrap">Name</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap">Privacy</TableHead>
                        <TableHead className="whitespace-nowrap">Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indexers.map((indexer) => (
                        <TableRow key={indexer.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIndexers.has(indexer.id)}
                              onCheckedChange={() => toggleIndexer(indexer.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {indexer.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{indexer.definitionName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                indexer.privacy === "private"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {indexer.privacy}
                            </Badge>
                          </TableCell>
                          <TableCell>{indexer.priority}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {config?.configured && scheduleInfo?.enabled && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Sync Schedule
                </CardTitle>
                <CardDescription>
                  Automatic indexer synchronization
                </CardDescription>
              </div>
              <Badge variant="secondary">
                Every {scheduleInfo.interval}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Next Sync</p>
                <p className="text-lg font-medium">
                  {scheduleInfo.nextSync
                    ? new Date(scheduleInfo.nextSync).toLocaleString()
                    : "Pending..."}
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  {scheduleInfo.lastSync
                    ? new Date(scheduleInfo.lastSync).toLocaleString()
                    : "Never"}
                  {scheduleInfo.lastSyncStatus === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {scheduleInfo.lastSyncStatus === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </p>
              </div>
            </div>

            {scheduleInfo.history && scheduleInfo.history.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium">Recent Sync History</span>
                </div>
                <div className="overflow-x-auto -mx-6">
                  <div className="inline-block min-w-full px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Time</TableHead>
                          <TableHead className="whitespace-nowrap">Type</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Indexers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduleInfo.history.slice(0, 5).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap">
                              {entry.timestamp
                                ? new Date(entry.timestamp).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  entry.status === "success"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.status === "success"
                                ? `${entry.indexersAdded} synced`
                                : entry.error || "Error"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
