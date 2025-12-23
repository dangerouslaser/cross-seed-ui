"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { CrossSeedConfig } from "@/types/config";
import { fetchConfig, useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

export default function SchedulingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { config, setConfig, setOriginalConfig, setError, updateConfig, error } = useConfigStore();

  useEffect(() => {
    async function loadConfig() {
      const configData = await fetchConfig();
      if (configData) {
        setConfig(configData);
        setOriginalConfig(configData);
      } else {
        setError("Failed to load configuration");
      }
      setIsLoading(false);
    }

    if (!config) {
      loadConfig();
    } else {
      setIsLoading(false);
    }
  }, [config, setConfig, setOriginalConfig, setError]);

  const handleChange = async <K extends keyof CrossSeedConfig>(
    key: K,
    value: CrossSeedConfig[K]
  ) => {
    const result = await updateConfigPartial({ [key]: value });
    if (result.success) {
      updateConfig({ [key]: value });
      toast.success("Setting updated");
    } else {
      toast.error(result.error || "Failed to update setting");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="text-muted-foreground">Configure timing and schedules</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
            <CardDescription>{error || "Unable to load configuration"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scheduling</h1>
        <p className="text-muted-foreground">
          Configure search schedules and timing options
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Cadence</CardTitle>
          <CardDescription>How often cross-seed searches for matches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>RSS Cadence</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How often to check RSS feeds. Minimum: 10 minutes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Check RSS feeds for new torrents
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.rssCadence !== null}
                onCheckedChange={(checked) =>
                  handleChange("rssCadence", checked ? "30 minutes" : null)
                }
              />
              {config.rssCadence !== null && (
                <Input
                  value={config.rssCadence}
                  onChange={(e) => handleChange("rssCadence", e.target.value)}
                  className="w-32"
                  placeholder="30 minutes"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Search Cadence</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How often to run full searches. Minimum: 1 day</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Run periodic searches for matches
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.searchCadence !== null}
                onCheckedChange={(checked) =>
                  handleChange("searchCadence", checked ? "1 day" : null)
                }
              />
              {config.searchCadence !== null && (
                <Input
                  value={config.searchCadence}
                  onChange={(e) => handleChange("searchCadence", e.target.value)}
                  className="w-32"
                  placeholder="1 day"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Search Limit</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum number of torrents to search per run</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="number"
              value={config.searchLimit ?? ""}
              onChange={(e) =>
                handleChange("searchLimit", e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-32"
              placeholder="400"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exclusion Rules</CardTitle>
          <CardDescription>Skip searching for certain torrents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Exclude Older</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Skip torrents added before this time period</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={config.excludeOlder}
              onChange={(e) => handleChange("excludeOlder", e.target.value)}
              className="w-48"
              placeholder="2 weeks"
            />
            <p className="text-xs text-muted-foreground">
              Examples: &quot;2 weeks&quot;, &quot;1 month&quot;, &quot;6 months&quot;
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Exclude Recent Search</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Skip torrents that were recently searched</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={config.excludeRecentSearch}
              onChange={(e) => handleChange("excludeRecentSearch", e.target.value)}
              className="w-48"
              placeholder="3 days"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeouts</CardTitle>
          <CardDescription>Configure request timeouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Snatch Timeout</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.snatchTimeout !== null}
                onCheckedChange={(checked) =>
                  handleChange("snatchTimeout", checked ? "30 seconds" : null)
                }
              />
              {config.snatchTimeout !== null && (
                <Input
                  value={config.snatchTimeout}
                  onChange={(e) => handleChange("snatchTimeout", e.target.value)}
                  className="w-32"
                  placeholder="30 seconds"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Timeout for downloading torrent files
            </p>
          </div>

          <div className="space-y-2">
            <Label>Search Timeout</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.searchTimeout !== null}
                onCheckedChange={(checked) =>
                  handleChange("searchTimeout", checked ? "2 minutes" : null)
                }
              />
              {config.searchTimeout !== null && (
                <Input
                  value={config.searchTimeout}
                  onChange={(e) => handleChange("searchTimeout", e.target.value)}
                  className="w-32"
                  placeholder="2 minutes"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Timeout for search requests to indexers
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
