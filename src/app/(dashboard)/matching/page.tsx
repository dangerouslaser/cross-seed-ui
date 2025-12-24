"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function MatchingPage() {
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
          <h1 className="text-3xl font-bold">Matching</h1>
          <p className="text-muted-foreground">
            Configure how cross-seed matches torrents
          </p>
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
        <h1 className="text-3xl font-bold">Matching</h1>
        <p className="text-muted-foreground">
          Configure how cross-seed matches torrents across trackers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match Mode</CardTitle>
          <CardDescription>
            Controls how strictly cross-seed matches torrents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Match Mode</Label>
            <Select
              value={config.matchMode}
              onValueChange={(v) => handleChange("matchMode", v as "strict" | "flexible" | "partial")}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">
                  <div>
                    <div className="font-medium">Strict</div>
                    <div className="text-xs text-muted-foreground">
                      All filenames must match exactly
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="flexible">
                  <div>
                    <div className="font-medium">Flexible (Recommended)</div>
                    <div className="text-xs text-muted-foreground">
                      Allows renames and inconsistencies
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="partial">
                  <div>
                    <div className="font-medium">Partial</div>
                    <div className="text-xs text-muted-foreground">
                      Flexible + allows missing small files
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label>Fuzzy Size Threshold</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Maximum allowed size difference between matched torrents.
                          Default is 2% (0.02).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current: {((config.fuzzySizeThreshold ?? 0.02) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-48">
                <Slider
                  value={[(config.fuzzySizeThreshold ?? 0.02) * 100]}
                  min={1}
                  max={10}
                  step={0.5}
                  onValueCommit={([v]) => handleChange("fuzzySizeThreshold", v / 100)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Types</CardTitle>
          <CardDescription>
            Configure which content types to include in matching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Single Episodes</Label>
              <p className="text-sm text-muted-foreground">
                Match individual episode files, not just season packs
              </p>
            </div>
            <Switch
              checked={config.includeSingleEpisodes ?? false}
              onCheckedChange={(checked) => handleChange("includeSingleEpisodes", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Non-Videos</Label>
              <p className="text-sm text-muted-foreground">
                Include non-video content (music, software, etc.)
              </p>
            </div>
            <Switch
              checked={config.includeNonVideos ?? false}
              onCheckedChange={(checked) => handleChange("includeNonVideos", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Season From Episodes</CardTitle>
          <CardDescription>
            Create season packs from individual episode matches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Season From Episodes</Label>
              <p className="text-sm text-muted-foreground">
                Combine episode matches into season pack matches
              </p>
            </div>
            <Switch
              checked={config.seasonFromEpisodes !== null}
              onCheckedChange={(checked) =>
                handleChange("seasonFromEpisodes", checked ? 1 : null)
              }
            />
          </div>

          {config.seasonFromEpisodes !== null && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Episode Ratio Required</Label>
                <p className="text-sm text-muted-foreground">
                  Current: {((config.seasonFromEpisodes || 1) * 100).toFixed(0)}% of episodes needed
                </p>
              </div>
              <div className="w-48">
                <Slider
                  value={[(config.seasonFromEpisodes || 1) * 100]}
                  min={50}
                  max={100}
                  step={5}
                  onValueCommit={([v]) => handleChange("seasonFromEpisodes", v / 100)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
