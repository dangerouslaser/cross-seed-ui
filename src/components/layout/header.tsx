"use client";

import { useEffect } from "react";
import { RefreshCw, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDaemonStore, checkDaemonStatus } from "@/lib/stores/daemon";
import { useAuthStore } from "@/lib/auth/client";

export function Header() {
  const { status, version, error } = useDaemonStore();
  const { user, authDisabled, logout } = useAuthStore();

  useEffect(() => {
    // Check status on mount
    checkDaemonStatus();

    // Poll every 30 seconds
    const interval = setInterval(checkDaemonStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    checkDaemonStatus();
  };

  const statusColor = {
    connected: "bg-green-500",
    disconnected: "bg-gray-400",
    error: "bg-red-500",
    checking: "bg-yellow-500 animate-pulse",
  };

  const statusText = {
    connected: version ? `Connected (v${version})` : "Connected",
    disconnected: "Disconnected",
    error: error || "Error",
    checking: "Checking...",
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Daemon:</span>
                <Badge
                  variant={
                    status === "connected"
                      ? "default"
                      : status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                  className="cursor-default"
                >
                  <span
                    className={`mr-1.5 h-2 w-2 rounded-full ${statusColor[status]}`}
                  />
                  {status === "connected"
                    ? "Connected"
                    : status === "error"
                      ? "Error"
                      : status === "checking"
                        ? "Checking"
                        : "Disconnected"}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusText[status]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={status === "checking"}
        >
          <RefreshCw
            className={`h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`}
          />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {!authDisabled && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {user.username}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
