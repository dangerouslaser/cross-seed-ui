"use client";

import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  daemonStatus?: "connected" | "disconnected" | "error";
}

export function Header({ daemonStatus = "disconnected" }: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Daemon:</span>
        <Badge
          variant={
            daemonStatus === "connected"
              ? "default"
              : daemonStatus === "error"
                ? "destructive"
                : "secondary"
          }
        >
          <span
            className={`mr-1.5 h-2 w-2 rounded-full ${
              daemonStatus === "connected"
                ? "bg-green-500"
                : daemonStatus === "error"
                  ? "bg-red-500"
                  : "bg-gray-400"
            }`}
          />
          {daemonStatus === "connected"
            ? "Connected"
            : daemonStatus === "error"
              ? "Error"
              : "Disconnected"}
        </Badge>
      </div>
    </header>
  );
}
