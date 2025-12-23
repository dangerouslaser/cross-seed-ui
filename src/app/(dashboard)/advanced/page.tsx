"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Download, History, RotateCcw, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchConfig, useConfigStore, updateConfigPartial } from "@/lib/stores/config";
import { toast } from "sonner";

interface Backup {
  filename: string;
  createdAt: string;
  size: number;
  reason: string;
}

export default function AdvancedPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [newBlockItem, setNewBlockItem] = useState("");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const { config, setConfig, setOriginalConfig, setError, updateConfig, error } = useConfigStore();

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const response = await fetch("/api/config/backups");
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error("Failed to load backups:", error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

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

    if (!config) {
      loadConfig();
    } else {
      setIsLoading(false);
    }

    loadBackups();
  }, [config, setConfig, setOriginalConfig, setError]);

  const handleAddBlockItem = async () => {
    if (!newBlockItem.trim()) return;
    const newList = [...(config?.blockList || []), newBlockItem.trim()];
    const result = await updateConfigPartial({ blockList: newList });
    if (result.success) {
      updateConfig({ blockList: newList });
      setNewBlockItem("");
      toast.success("Block list updated");
    } else {
      toast.error("Failed to update block list");
    }
  };

  const handleRemoveBlockItem = async (index: number) => {
    const newList = (config?.blockList || []).filter((_, i) => i !== index);
    const result = await updateConfigPartial({ blockList: newList });
    if (result.success) {
      updateConfig({ blockList: newList });
      toast.success("Block list updated");
    } else {
      toast.error("Failed to update block list");
    }
  };

  const handleExportConfig = async () => {
    try {
      const response = await fetch("/api/config/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "config.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Config exported");
      } else {
        toast.error("Failed to export config");
      }
    } catch {
      toast.error("Failed to export config");
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await fetch("/api/config/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual" }),
      });
      if (response.ok) {
        toast.success("Backup created");
        loadBackups();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create backup");
      }
    } catch {
      toast.error("Failed to create backup");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    setIsRestoring(filename);
    try {
      const response = await fetch("/api/config/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Config restored. Restart cross-seed to apply changes.");
        if (data.config) {
          setConfig(data.config);
          setOriginalConfig(data.config);
        }
        loadBackups();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to restore backup");
      }
    } catch {
      toast.error("Failed to restore backup");
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/config/backups?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Backup deleted");
        loadBackups();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete backup");
      }
    } catch {
      toast.error("Failed to delete backup");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Advanced</h1>
          <p className="text-muted-foreground">Advanced configuration options</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
            <CardDescription>{error || "Unable to load configuration"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Advanced</h1>
        <p className="text-muted-foreground">
          Advanced settings and utilities
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Block List</CardTitle>
          <CardDescription>
            Patterns to exclude from cross-seeding (regex supported)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(config.blockList || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No block list entries.</p>
          ) : (
            <div className="space-y-2">
              {(config.blockList || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={item} readOnly className="font-mono" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlockItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Pattern to block (e.g., .*sample.*)"
              value={newBlockItem}
              onChange={(e) => setNewBlockItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBlockItem()}
            />
            <Button onClick={handleAddBlockItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Configuration</CardTitle>
          <CardDescription>
            View the current configuration as JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={JSON.stringify(config, null, 2)}
            readOnly
            className="font-mono text-xs h-64"
          />
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export config.js
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Configuration Backups</CardTitle>
              <CardDescription>
                Manage config.js backups and restore previous versions
              </CardDescription>
            </div>
            <Button onClick={handleCreateBackup} disabled={isCreatingBackup} className="w-fit">
              {isCreatingBackup ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Backup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm">Backups are created automatically when you save configuration changes</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Size</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell>
                      {new Date(backup.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={backup.reason === "manual" ? "default" : "secondary"}>
                        {backup.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(backup.size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isRestoring === backup.filename}
                            >
                              {isRestoring === backup.filename ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will replace your current config.js with the backup from{" "}
                                {new Date(backup.createdAt).toLocaleString()}.
                                A backup of your current config will be created first.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestoreBackup(backup.filename)}
                              >
                                Restore
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the backup from{" "}
                                {new Date(backup.createdAt).toLocaleString()}.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteBackup(backup.filename)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
