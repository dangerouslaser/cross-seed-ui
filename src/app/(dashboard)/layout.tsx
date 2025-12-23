"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { RestartBanner } from "@/components/layout/restart-banner";
import { checkSetupRequired, checkAuth, useAuthStore } from "@/lib/auth/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, setAuthenticated, setAuthDisabled } = useAuthStore();

  useEffect(() => {
    async function init() {
      // First check if setup is required
      const setupStatus = await checkSetupRequired();

      if (setupStatus.authDisabled) {
        setAuthDisabled(true);
        setAuthenticated(true);
        setIsLoading(false);
        return;
      }

      if (setupStatus.setupRequired) {
        router.replace("/setup");
        return;
      }

      // Check authentication
      const authStatus = await checkAuth();

      if (!authStatus.authenticated) {
        router.replace("/login");
        return;
      }

      setUser(authStatus.user);
      setAuthenticated(true);
      setIsLoading(false);
    }

    init();
  }, [router, setUser, setAuthenticated, setAuthDisabled]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <RestartBanner />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
