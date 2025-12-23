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
import { CrossSeedConfig } from "@/types/config";
import { useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

interface NotificationsTabProps {
  config: CrossSeedConfig;
}

export function NotificationsTab({ config }: NotificationsTabProps) {
  const { updateConfig } = useConfigStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  // Form state
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  const webhooks = config.notificationWebhookUrls || [];

  const handleAddWebhook = async () => {
    if (!newWebhookUrl) {
      toast.error("Webhook URL is required");
      return;
    }

    const newWebhooks = [...webhooks, newWebhookUrl];

    const result = await updateConfigPartial({ notificationWebhookUrls: newWebhooks });
    if (result.success) {
      updateConfig({ notificationWebhookUrls: newWebhooks });
      toast.success("Webhook added");
      setIsAddDialogOpen(false);
      setNewWebhookUrl("");
    } else {
      toast.error(result.error || "Failed to add webhook");
    }
  };

  const handleRemoveWebhook = async (index: number) => {
    const newWebhooks = webhooks.filter((_, i) => i !== index);

    const result = await updateConfigPartial({ notificationWebhookUrls: newWebhooks });
    if (result.success) {
      updateConfig({ notificationWebhookUrls: newWebhooks });
      toast.success("Webhook removed");
    } else {
      toast.error(result.error || "Failed to remove webhook");
    }
  };

  const handleTestWebhook = async (webhookUrl: string) => {
    setTestingWebhook(webhookUrl);

    try {
      const response = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "notification", url: webhookUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults((prev) => ({ ...prev, [webhookUrl]: "success" }));
        toast.success("Test notification sent");
      } else {
        setTestResults((prev) => ({ ...prev, [webhookUrl]: "error" }));
        toast.error(data.error || "Failed to send notification");
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [webhookUrl]: "error" }));
      toast.error("Failed to test webhook");
    } finally {
      setTestingWebhook(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Webhooks</CardTitle>
            <CardDescription>
              Configure webhook URLs for cross-seed notifications (Apprise compatible)
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Notification Webhook</DialogTitle>
                <DialogDescription>
                  Enter an Apprise-compatible webhook URL
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://ntfy.sh/your-topic"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports Apprise URLs like Discord, Telegram, ntfy, etc.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddWebhook}>Add Webhook</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notification webhooks configured. Add one to receive cross-seed notifications.
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm truncate max-w-lg">
                    {webhook}
                  </span>
                  {testResults[webhook] === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {testResults[webhook] === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestWebhook(webhook)}
                    disabled={testingWebhook === webhook}
                  >
                    {testingWebhook === webhook ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    <span className="ml-2">Test</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveWebhook(index)}
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
