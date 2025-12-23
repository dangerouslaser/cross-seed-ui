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

interface IndexersTabProps {
  config: CrossSeedConfig;
}

export function IndexersTab({ config }: IndexersTabProps) {
  const { updateConfig } = useConfigStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingIndexer, setTestingIndexer] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  // Form state
  const [newIndexerUrl, setNewIndexerUrl] = useState("");
  const [newIndexerName, setNewIndexerName] = useState("");

  const indexers = config.torznab || [];

  const handleAddIndexer = async () => {
    if (!newIndexerUrl) {
      toast.error("URL is required");
      return;
    }

    const newIndexers = [...indexers, newIndexerUrl];

    const result = await updateConfigPartial({ torznab: newIndexers });
    if (result.success) {
      updateConfig({ torznab: newIndexers });
      toast.success("Indexer added");
      setIsAddDialogOpen(false);
      setNewIndexerUrl("");
      setNewIndexerName("");
    } else {
      toast.error(result.error || "Failed to add indexer");
    }
  };

  const handleRemoveIndexer = async (index: number) => {
    const newIndexers = indexers.filter((_, i) => i !== index);

    const result = await updateConfigPartial({ torznab: newIndexers });
    if (result.success) {
      updateConfig({ torznab: newIndexers });
      toast.success("Indexer removed");
    } else {
      toast.error(result.error || "Failed to remove indexer");
    }
  };

  const handleTestIndexer = async (indexerUrl: string) => {
    setTestingIndexer(indexerUrl);

    try {
      const response = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "torznab", url: indexerUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults((prev) => ({ ...prev, [indexerUrl]: "success" }));
        toast.success("Indexer is reachable");
      } else {
        setTestResults((prev) => ({ ...prev, [indexerUrl]: "error" }));
        toast.error(data.error || "Connection failed");
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [indexerUrl]: "error" }));
      toast.error("Failed to test connection");
    } finally {
      setTestingIndexer(null);
    }
  };

  const getIndexerName = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Torznab Indexers</CardTitle>
              <CardDescription>
                Add Torznab-compatible indexer URLs for cross-seed to search
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Indexer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Torznab Indexer</DialogTitle>
                  <DialogDescription>
                    Enter the Torznab URL for your indexer (includes API key)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name (optional)</Label>
                    <Input
                      placeholder="My Indexer"
                      value={newIndexerName}
                      onChange={(e) => setNewIndexerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Torznab URL</Label>
                    <Input
                      placeholder="http://prowlarr:9696/1/api?apikey=..."
                      value={newIndexerUrl}
                      onChange={(e) => setNewIndexerUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Include the full URL with API key from Prowlarr or your indexer
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddIndexer}>Add Indexer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {indexers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No indexers configured. Add Torznab URLs from Prowlarr or your indexer.
            </div>
          ) : (
            <div className="space-y-3">
              {indexers.map((indexer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Torznab</Badge>
                    <span className="font-medium">{getIndexerName(indexer)}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-md">
                      {indexer.replace(/apikey=[^&]+/, "apikey=***")}
                    </span>
                    {testResults[indexer] === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {testResults[indexer] === "error" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestIndexer(indexer)}
                      disabled={testingIndexer === indexer}
                    >
                      {testingIndexer === indexer ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span className="ml-2">Test</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIndexer(index)}
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
    </div>
  );
}
