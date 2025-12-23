"use client";

import { useState } from "react";
import { AlertTriangle, X, Info, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useConfigStore } from "@/lib/stores/config";
import { useDaemonStore } from "@/lib/stores/daemon";
import { toast } from "sonner";

export function RestartBanner() {
  const { requiresRestart, changedOptions, resetChanges } = useConfigStore();
  const daemonStatus = useDaemonStore((state) => state.status);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const isConnected = daemonStatus === "connected";

  if (!requiresRestart || isDismissed) return null;

  const handleRestart = async () => {
    if (!isConnected) {
      toast.error("Cannot restart: daemon not connected");
      return;
    }

    setIsRestarting(true);
    try {
      const response = await fetch("/api/daemon/restart", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Daemon restart initiated. It may take a moment to reconnect.");
        resetChanges();
        setIsDismissed(true);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to restart daemon");
      }
    } catch {
      toast.error("Failed to restart daemon");
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 dark:bg-yellow-900/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Configuration Changed
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between text-yellow-700 dark:text-yellow-300">
        <span>
          Restart cross-seed to apply changes
          {changedOptions.length > 0 && (
            <span className="ml-1 font-mono text-xs">
              ({changedOptions.join(", ")})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={isRestarting}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
            >
              {isRestarting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Restart Now
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
                >
                  <Info className="h-4 w-4 mr-2" />
                  How to restart?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>How to Restart Cross-Seed</DialogTitle>
                  <DialogDescription>
                    Choose the method that matches your installation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Docker</h4>
                    <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                      docker restart cross-seed
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Docker Compose</h4>
                    <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                      docker compose restart cross-seed
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Systemd Service</h4>
                    <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                      sudo systemctl restart cross-seed
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Direct Process</h4>
                    <p className="text-sm text-muted-foreground">
                      Stop the running process and start it again with <code>cross-seed daemon</code>
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-yellow-700 hover:text-yellow-900 dark:text-yellow-300"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
