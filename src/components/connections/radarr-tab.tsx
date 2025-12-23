"use client";

import { useState } from "react";
import { Plus, Trash2, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";
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
import { CrossSeedConfig } from "@/types/config";
import { useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

interface RadarrTabProps {
  config: CrossSeedConfig;
}

export function RadarrTab({ config }: RadarrTabProps) {
  const { updateConfig } = useConfigStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingInstance, setTestingInstance] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  // Form state
  const [newUrl, setNewUrl] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  const instances = config.radarr || [];

  const handleAddInstance = async () => {
    if (!newUrl || !newApiKey) {
      toast.error("URL and API key are required");
      return;
    }

    const instanceUrl = `${newUrl.replace(/\/$/, "")}?apikey=${newApiKey}`;
    const newInstances = [...instances, instanceUrl];

    const result = await updateConfigPartial({ radarr: newInstances });
    if (result.success) {
      updateConfig({ radarr: newInstances });
      toast.success("Radarr instance added");
      setIsAddDialogOpen(false);
      setNewUrl("");
      setNewApiKey("");
    } else {
      toast.error(result.error || "Failed to add instance");
    }
  };

  const handleRemoveInstance = async (index: number) => {
    const newInstances = instances.filter((_, i) => i !== index);

    const result = await updateConfigPartial({ radarr: newInstances });
    if (result.success) {
      updateConfig({ radarr: newInstances });
      toast.success("Radarr instance removed");
    } else {
      toast.error(result.error || "Failed to remove instance");
    }
  };

  const handleTestInstance = async (instanceUrl: string) => {
    setTestingInstance(instanceUrl);

    try {
      const response = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "radarr", url: instanceUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults((prev) => ({ ...prev, [instanceUrl]: "success" }));
        toast.success(`Connected to Radarr ${data.version || ""}`);
      } else {
        setTestResults((prev) => ({ ...prev, [instanceUrl]: "error" }));
        toast.error(data.error || "Connection failed");
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [instanceUrl]: "error" }));
      toast.error("Failed to test connection");
    } finally {
      setTestingInstance(null);
    }
  };

  const getInstanceName = (url: string): string => {
    try {
      const parsed = new URL(url.split("?")[0]);
      return parsed.hostname;
    } catch {
      return "Unknown";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Radarr Instances</CardTitle>
            <CardDescription>
              Connect Radarr for movie data matching
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Radarr
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Radarr Instance</DialogTitle>
                <DialogDescription>
                  Enter your Radarr URL and API key
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    placeholder="http://localhost:7878"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter API key"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in Radarr → Settings → General → API Key
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddInstance}>Add Instance</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {instances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No Radarr instances configured. Add one to enable movie matching.
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((instance, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Radarr</Badge>
                  <span className="font-medium">{getInstanceName(instance)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {instance.replace(/apikey=[^&]+/, "apikey=***")}
                  </span>
                  {testResults[instance] === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {testResults[instance] === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestInstance(instance)}
                    disabled={testingInstance === instance}
                  >
                    {testingInstance === instance ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    <span className="ml-2">Test</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveInstance(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
