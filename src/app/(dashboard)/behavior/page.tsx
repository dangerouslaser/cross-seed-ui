"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function BehaviorPage() {
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
          <h1 className="text-3xl font-bold">Behavior</h1>
          <p className="text-muted-foreground">Configure cross-seed behavior</p>
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Behavior</h1>
        <p className="text-muted-foreground">
          Configure how cross-seed handles matched torrents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Mode</CardTitle>
          <CardDescription>What to do when a match is found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={config.action}
              onValueChange={(v) => handleChange("action", v as "save" | "inject")}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inject">
                  <div>
                    <div className="font-medium">Inject (Recommended)</div>
                    <div className="text-xs text-muted-foreground">
                      Add torrents directly to client
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="save">
                  <div>
                    <div className="font-medium">Save</div>
                    <div className="text-xs text-muted-foreground">
                      Save .torrent files to output directory
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Delay</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delay between injecting torrents (rate limiting)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {config.delay} seconds
              </p>
            </div>
            <div className="w-48">
              <Slider
                value={[config.delay]}
                min={30}
                max={300}
                step={10}
                onValueCommit={([v]) => handleChange("delay", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recheck Settings</CardTitle>
          <CardDescription>Configure torrent rechecking behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Skip Recheck</Label>
              <p className="text-sm text-muted-foreground">
                Skip rechecking when injecting torrents (faster but riskier)
              </p>
            </div>
            <Switch
              checked={config.skipRecheck}
              onCheckedChange={(checked) => handleChange("skipRecheck", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Resume Settings</CardTitle>
          <CardDescription>Control automatic resuming of partial matches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Auto-Resume Max Download</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Maximum download size to auto-resume a partial match</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {formatBytes(config.autoResumeMaxDownload)}
              </p>
            </div>
            <div className="w-48">
              <Slider
                value={[config.autoResumeMaxDownload / (1024 * 1024)]}
                min={0}
                max={50}
                step={1}
                onValueCommit={([v]) => handleChange("autoResumeMaxDownload", v * 1024 * 1024)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ignore Non-Relevant Files to Resume</Label>
              <p className="text-sm text-muted-foreground">
                Ignore sample files and other non-relevant files when resuming
              </p>
            </div>
            <Switch
              checked={config.ignoreNonRelevantFilesToResume}
              onCheckedChange={(checked) =>
                handleChange("ignoreNonRelevantFilesToResume", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Category handling in torrent client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Duplicate Categories</Label>
              <p className="text-sm text-muted-foreground">
                Allow the same torrent to be in multiple categories
              </p>
            </div>
            <Switch
              checked={config.duplicateCategories}
              onCheckedChange={(checked) => handleChange("duplicateCategories", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
