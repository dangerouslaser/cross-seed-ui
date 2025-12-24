"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CrossSeedConfig } from "@/types/config";
import { fetchConfig, useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

export default function PathsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { config, setConfig, setOriginalConfig, setError, updateConfig, error } = useConfigStore();
  const [newDataDir, setNewDataDir] = useState("");
  const [newLinkDir, setNewLinkDir] = useState("");

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

  const handleAddDataDir = async () => {
    if (!newDataDir.trim()) return;
    const newDirs = [...(config?.dataDirs || []), newDataDir.trim()];
    await handleChange("dataDirs", newDirs);
    setNewDataDir("");
  };

  const handleRemoveDataDir = async (index: number) => {
    const newDirs = (config?.dataDirs || []).filter((_, i) => i !== index);
    await handleChange("dataDirs", newDirs);
  };

  const handleAddLinkDir = async () => {
    if (!newLinkDir.trim()) return;
    const newDirs = [...(config?.linkDirs || []), newLinkDir.trim()];
    await handleChange("linkDirs", newDirs);
    setNewLinkDir("");
  };

  const handleRemoveLinkDir = async (index: number) => {
    const newDirs = (config?.linkDirs || []).filter((_, i) => i !== index);
    await handleChange("linkDirs", newDirs);
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
          <h1 className="text-3xl font-bold">Paths</h1>
          <p className="text-muted-foreground">Configure data and output paths</p>
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
        <h1 className="text-3xl font-bold">Paths</h1>
        <p className="text-muted-foreground">
          Configure data directories and linking options
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Directories</CardTitle>
          <CardDescription>
            Directories containing your media files for cross-seed to scan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(config.dataDirs || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No data directories configured.</p>
          ) : (
            <div className="space-y-2">
              {(config.dataDirs || []).map((dir, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={dir} readOnly className="font-mono" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDataDir(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="/path/to/media"
              value={newDataDir}
              onChange={(e) => setNewDataDir(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDataDir()}
            />
            <Button onClick={handleAddDataDir}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Max Data Depth</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How many directory levels deep to scan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {config.maxDataDepth ?? 2} levels
              </p>
            </div>
            <div className="w-48">
              <Slider
                value={[config.maxDataDepth ?? 2]}
                min={1}
                max={10}
                step={1}
                onValueCommit={([v]) => handleChange("maxDataDepth", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link Directories</CardTitle>
          <CardDescription>
            Where cross-seed will create links for matched torrents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(config.linkDirs || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No link directories configured.</p>
          ) : (
            <div className="space-y-2">
              {(config.linkDirs || []).map((dir, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={dir} readOnly className="font-mono" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLinkDir(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="/path/to/links"
              value={newLinkDir}
              onChange={(e) => setNewLinkDir(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddLinkDir()}
            />
            <Button onClick={handleAddLinkDir}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linking Options</CardTitle>
          <CardDescription>Configure how files are linked</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Link Type</Label>
            <Select
              value={config.linkType}
              onValueChange={(v) => handleChange("linkType", v as "hardlink" | "symlink" | "reflink")}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hardlink">Hardlink (Recommended)</SelectItem>
                <SelectItem value="symlink">Symlink</SelectItem>
                <SelectItem value="reflink">Reflink (CoW)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Link Category</Label>
            <Input
              value={config.linkCategory}
              onChange={(e) => handleChange("linkCategory", e.target.value)}
              className="w-64"
            />
            <p className="text-xs text-muted-foreground">
              Category name for linked torrents in your client
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Flat Linking</Label>
              <p className="text-sm text-muted-foreground">
                Put all links in the root of link directory (no subdirectories)
              </p>
            </div>
            <Switch
              checked={config.flatLinking ?? false}
              onCheckedChange={(checked) => handleChange("flatLinking", checked)}
            />
          </div>

          {(config.flatLinking ?? false) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Flat linking may cause issues if you have files with the same name
                in different directories.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output Directories</CardTitle>
          <CardDescription>Optional directories for saving torrents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Torrent Directory</Label>
            <Input
              placeholder="/path/to/torrents (optional)"
              value={config.torrentDir || ""}
              onChange={(e) => handleChange("torrentDir", e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">
              Directory to scan for .torrent files (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Output Directory</Label>
            <Input
              placeholder="/path/to/output (optional)"
              value={config.outputDir || ""}
              onChange={(e) => handleChange("outputDir", e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">
              Directory to save matched .torrent files (for &quot;save&quot; action mode)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
