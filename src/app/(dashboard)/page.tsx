"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle, Clock, Server, ArrowRight, RefreshCw, AlertCircle, Zap, HardDrive, Search, Download } from "lucide-react";
import { CrossSeedConfig } from "@/types/config";

interface DaemonStatus {
  running: boolean;
  version?: string;
  error?: string;
  configured?: boolean;
}

interface DashboardStats {
  torrentClients: number;
  indexers: number;
  sonarrInstances: number;
  radarrInstances: number;
  searchCadence?: string | null;
  rssCadence?: string | null;
  action?: string | null;
  matchMode?: string | null;
}

function calculateStats(config: CrossSeedConfig | null): DashboardStats {
  if (!config) {
    return {
      torrentClients: 0,
      indexers: 0,
      sonarrInstances: 0,
      radarrInstances: 0,
    };
  }

  return {
    torrentClients: config.torrentClients?.length || 0,
    indexers: config.torznab?.length || 0,
    sonarrInstances: config.sonarr?.length || 0,
    radarrInstances: config.radarr?.length || 0,
    searchCadence: config.searchCadence,
    rssCadence: config.rssCadence,
    action: config.action,
    matchMode: config.matchMode,
  };
}

export default function DashboardPage() {
  const [config, setConfig] = useState<CrossSeedConfig | null>(null);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>({ running: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [configRes, statusRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/daemon/status"),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDaemonStatus(statusData);
      } else {
        setDaemonStatus({ running: false, error: "Could not reach daemon" });
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setDaemonStatus({ running: false, error: "Connection failed" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Refresh daemon status every 30 seconds
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch("/api/daemon/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setDaemonStatus(statusData);
        }
      } catch {
        setDaemonStatus({ running: false, error: "Connection failed" });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const stats = calculateStats(config);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Overview of your cross-seed installation
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="w-fit">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daemon Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {daemonStatus.running ? (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {daemonStatus.running && daemonStatus.version
                ? `Version ${daemonStatus.version}`
                : daemonStatus.error || "Configure CROSSSEED_URL to connect"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Torrent Clients</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.torrentClients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.torrentClients === 1 ? "configured client" : "configured clients"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indexers</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.indexers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.indexers === 1 ? "active indexer" : "active indexers"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Mode</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {stats.action || "inject"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.searchCadence ? `Every ${stats.searchCadence}` : "No schedule set"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sonarr</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sonarrInstances}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sonarrInstances === 1 ? "instance" : "instances"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Radarr</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.radarrInstances}</div>
            <p className="text-xs text-muted-foreground">
              {stats.radarrInstances === 1 ? "instance" : "instances"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Mode</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {stats.matchMode || "flexible"}
            </div>
            <p className="text-xs text-muted-foreground">
              matching strategy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RSS Cadence</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.rssCadence || "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              feed check interval
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
            <CardDescription>
              Get started with cross-seed configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/connections" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    {stats.torrentClients > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      "1"
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Configure Torrent Client</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.torrentClients > 0
                        ? `${stats.torrentClients} client(s) configured`
                        : "Add your qBittorrent, rTorrent, or other client"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/connections" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    {stats.indexers > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Add Indexers</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.indexers > 0
                        ? `${stats.indexers} indexer(s) configured`
                        : "Connect Prowlarr or add Torznab URLs"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/paths" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    {config?.dataDirs?.length ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      "3"
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Configure Paths</p>
                    <p className="text-sm text-muted-foreground">
                      {config?.dataDirs?.length
                        ? `${config.dataDirs.length} data directory(s) configured`
                        : "Set up data directories and linking options"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
            <CardDescription>
              Current cross-seed configuration summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Action Mode</span>
                  <Badge variant="outline" className="capitalize">
                    {config.action || "inject"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Match Mode</span>
                  <Badge variant="outline" className="capitalize">
                    {config.matchMode || "flexible"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">API Enabled</span>
                  <Badge variant={config.apiKey ? "default" : "secondary"}>
                    {config.apiKey ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Duplicate Categories</span>
                  <span className="text-sm">
                    {config.duplicateCategories ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Port</span>
                  <span className="text-sm font-mono">
                    {config.port || 2468}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Unable to load configuration
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
