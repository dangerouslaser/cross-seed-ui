"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function NetworkPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateApiKey = async () => {
    const newKey = generateApiKey();
    await handleChange("apiKey", newKey);
  };

  const handleCopyApiKey = () => {
    if (config?.apiKey) {
      navigator.clipboard.writeText(config.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("API key copied to clipboard");
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
          <h1 className="text-3xl font-bold">Network</h1>
          <p className="text-muted-foreground">Configure network settings</p>
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
        <h1 className="text-3xl font-bold">Network</h1>
        <p className="text-muted-foreground">
          Configure cross-seed daemon network settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daemon Binding</CardTitle>
          <CardDescription>
            Configure where the cross-seed daemon listens for connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input
                value={config.host}
                onChange={(e) => handleChange("host", e.target.value)}
                placeholder="0.0.0.0"
              />
              <p className="text-xs text-muted-foreground">
                Use 0.0.0.0 to listen on all interfaces
              </p>
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={config.port}
                onChange={(e) => handleChange("port", parseInt(e.target.value) || 2468)}
                placeholder="2468"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Authentication key for the cross-seed API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                value={config.apiKey || ""}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                placeholder="Enter or generate an API key"
                className="font-mono"
              />
              <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" onClick={handleGenerateApiKey}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This key is required for webhook and API authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
