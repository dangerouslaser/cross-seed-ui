"use client";

import { useState, useEffect } from "react";
import {
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AutobrrConfig {
  configured: boolean;
  url?: string;
}

interface WebhookConfig {
  crossSeedUrl: string;
  webhookUrl: string;
  apiKey: string;
  actionJson: string;
  webhookData: string;
}

export function AutobrrTab() {
  const [config, setConfig] = useState<AutobrrConfig | null>(null);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formApiKey, setFormApiKey] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const [configResponse, webhookResponse] = await Promise.all([
        fetch("/api/autobrr"),
        fetch("/api/autobrr/webhook"),
      ]);

      const configData = await configResponse.json();
      setConfig(configData);

      if (configData.configured) {
        setFormUrl(configData.url || "");
      }

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        setWebhookConfig(webhookData);
      }
    } catch (error) {
      console.error("Failed to load autobrr config:", error);
    } finally {
      setIsLoading(false);
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
      const response = await fetch("/api/autobrr/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, apiKey: formApiKey }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult("success");
        toast.success(`Connected to autobrr${data.version ? ` v${data.version}` : ""}`);
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
      const response = await fetch("/api/autobrr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          apiKey: formApiKey,
        }),
      });

      if (response.ok) {
        toast.success("autobrr configuration saved");
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
      const response = await fetch("/api/autobrr", { method: "DELETE" });
      if (response.ok) {
        toast.success("autobrr configuration removed");
        setConfig({ configured: false });
        setFormUrl("");
        setFormApiKey("");
      }
    } catch {
      toast.error("Failed to remove configuration");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>autobrr Integration</CardTitle>
              <CardDescription>
                Connect to autobrr for automatic cross-seed announcements
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
                  <DialogTitle>autobrr Configuration</DialogTitle>
                  <DialogDescription>
                    Connect to your autobrr instance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>autobrr URL</Label>
                    <Input
                      placeholder="http://localhost:7474"
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
                      Find this in autobrr → Settings → API
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
              <span className="text-muted-foreground">{config.url}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Webhook Configuration Helper */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Use these values to configure an autobrr action that announces to cross-seed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {webhookConfig ? (
            <>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookConfig.webhookUrl}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookConfig.webhookUrl, "Webhook URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Key Header</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookConfig.apiKey || "(not set in cross-seed config)"}
                    className="font-mono text-sm"
                    type={webhookConfig.apiKey ? "password" : "text"}
                  />
                  {webhookConfig.apiKey && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookConfig.apiKey, "API Key")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Header name: <code className="bg-muted px-1 rounded">X-Api-Key</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook Data Template</Label>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={webhookConfig.webhookData}
                    className="font-mono text-sm min-h-[120px]"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(webhookConfig.webhookData, "Webhook data")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label>Complete Action JSON</Label>
                <p className="text-sm text-muted-foreground">
                  Copy this JSON to quickly configure a new webhook action in autobrr
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={webhookConfig.actionJson}
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(webhookConfig.actionJson, "Action JSON")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <span>
                  Add this as a Webhook action in autobrr filter settings
                </span>
              </div>
            </>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              Unable to load webhook configuration. Make sure cross-seed config is accessible.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
