"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TorrentClientsTab } from "@/components/connections/torrent-clients-tab";
import { ProwlarrTab } from "@/components/connections/prowlarr-tab";
import { IndexersTab } from "@/components/connections/indexers-tab";
import { SonarrTab } from "@/components/connections/sonarr-tab";
import { RadarrTab } from "@/components/connections/radarr-tab";
import { NotificationsTab } from "@/components/connections/notifications-tab";
import { AutobrrTab } from "@/components/connections/autobrr-tab";
import { fetchConfig, useConfigStore } from "@/lib/stores/config";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { config, setConfig, setOriginalConfig, setError, error } = useConfigStore();

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

    loadConfig();
  }, [setConfig, setOriginalConfig, setError]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Connections</h1>
          <p className="text-muted-foreground">
            Configure torrent clients, indexers, and integrations
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
            <CardDescription>
              {error || "Unable to load cross-seed configuration"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Make sure the CROSSSEED_CONFIG_PATH environment variable is set correctly
              and the config.js file exists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-muted-foreground">
          Configure torrent clients, indexers, and integrations
        </p>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Torrent Clients</TabsTrigger>
          <TabsTrigger value="prowlarr">Prowlarr</TabsTrigger>
          <TabsTrigger value="indexers">Manual Indexers</TabsTrigger>
          <TabsTrigger value="sonarr">Sonarr</TabsTrigger>
          <TabsTrigger value="radarr">Radarr</TabsTrigger>
          <TabsTrigger value="autobrr">autobrr</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <TorrentClientsTab config={config} />
        </TabsContent>

        <TabsContent value="prowlarr">
          <ProwlarrTab />
        </TabsContent>

        <TabsContent value="indexers">
          <IndexersTab config={config} />
        </TabsContent>

        <TabsContent value="sonarr">
          <SonarrTab config={config} />
        </TabsContent>

        <TabsContent value="radarr">
          <RadarrTab config={config} />
        </TabsContent>

        <TabsContent value="autobrr">
          <AutobrrTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab config={config} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
