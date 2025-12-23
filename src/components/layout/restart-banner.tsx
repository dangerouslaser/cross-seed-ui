"use client";

import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface RestartBannerProps {
  show: boolean;
  changedOptions?: string[];
  onDismiss?: () => void;
}

export function RestartBanner({
  show,
  changedOptions = [],
  onDismiss,
}: RestartBannerProps) {
  if (!show) return null;

  return (
    <Alert className="rounded-none border-x-0 border-b-0 bg-yellow-50 dark:bg-yellow-900/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Configuration Changed
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between text-yellow-700 dark:text-yellow-300">
        <span>
          Restart cross-seed to apply changes
          {changedOptions.length > 0 && (
            <span className="ml-1">
              ({changedOptions.join(", ")})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
          >
            How to restart?
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-yellow-700 hover:text-yellow-900 dark:text-yellow-300"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
