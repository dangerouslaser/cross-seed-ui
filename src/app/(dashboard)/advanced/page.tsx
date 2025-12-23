"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CrossSeedConfig } from "@/types/config";
import { fetchConfig, useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

export default function AdvancedPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [newBlockItem, setNewBlockItem] = useState("");
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

  const handleAddBlockItem = async () => {
    if (!newBlockItem.trim()) return;
    const newList = [...(config?.blockList || []), newBlockItem.trim()];
    const result = await updateConfigPartial({ blockList: newList });
    if (result.success) {
      updateConfig({ blockList: newList });
      setNewBlockItem("");
      toast.success("Block list updated");
    } else {
      toast.error("Failed to update block list");
    }
  };

  const handleRemoveBlockItem = async (index: number) => {
    const newList = (config?.blockList || []).filter((_, i) => i !== index);
    const result = await updateConfigPartial({ blockList: newList });
    if (result.success) {
      updateConfig({ blockList: newList });
      toast.success("Block list updated");
    } else {
      toast.error("Failed to update block list");
    }
  };

  const handleExportConfig = () => {
    if (!config) return;
    const content = `// Cross-seed configuration
// Exported from CrossSeed UI on ${new Date().toISOString()}

module.exports = ${JSON.stringify(config, null, 2)};
`;
    const blob = new Blob([content], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Config exported");
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
          <h1 className="text-3xl font-bold">Advanced</h1>
          <p className="text-muted-foreground">Advanced configuration options</p>
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
        <h1 className="text-3xl font-bold">Advanced</h1>
        <p className="text-muted-foreground">
          Advanced settings and utilities
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Block List</CardTitle>
          <CardDescription>
            Patterns to exclude from cross-seeding (regex supported)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(config.blockList || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No block list entries.</p>
          ) : (
            <div className="space-y-2">
              {(config.blockList || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={item} readOnly className="font-mono" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlockItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Pattern to block (e.g., .*sample.*)"
              value={newBlockItem}
              onChange={(e) => setNewBlockItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBlockItem()}
            />
            <Button onClick={handleAddBlockItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Configuration</CardTitle>
          <CardDescription>
            View the current configuration as JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={JSON.stringify(config, null, 2)}
            readOnly
            className="font-mono text-xs h-64"
          />
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export config.js
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
