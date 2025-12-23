"use client";

import { create } from "zustand";
import { CrossSeedConfig, RESTART_REQUIRED_OPTIONS } from "@/types/config";

interface ConfigState {
  config: CrossSeedConfig | null;
  originalConfig: CrossSeedConfig | null;
  isLoading: boolean;
  error: string | null;
  changedOptions: string[];
  requiresRestart: boolean;

  setConfig: (config: CrossSeedConfig) => void;
  setOriginalConfig: (config: CrossSeedConfig) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateConfig: (updates: Partial<CrossSeedConfig>) => void;
  resetChanges: () => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  originalConfig: null,
  isLoading: true,
  error: null,
  changedOptions: [],
  requiresRestart: false,

  setConfig: (config) => set({ config }),
  setOriginalConfig: (config) => set({ originalConfig: config }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  updateConfig: (updates) => {
    const { config, originalConfig } = get();
    if (!config) return;

    const newConfig = { ...config, ...updates };

    // Calculate changed options
    const changedOptions: string[] = [];
    if (originalConfig) {
      for (const key of Object.keys(updates) as (keyof CrossSeedConfig)[]) {
        if (JSON.stringify(newConfig[key]) !== JSON.stringify(originalConfig[key])) {
          changedOptions.push(key);
        }
      }
    }

    // Check if restart is required
    const requiresRestart = changedOptions.some((opt) =>
      RESTART_REQUIRED_OPTIONS.includes(opt as (typeof RESTART_REQUIRED_OPTIONS)[number])
    );

    set({ config: newConfig, changedOptions, requiresRestart });
  },

  resetChanges: () => {
    const { originalConfig } = get();
    set({
      config: originalConfig,
      changedOptions: [],
      requiresRestart: false,
    });
  },
}));

// API functions
export async function fetchConfig(): Promise<CrossSeedConfig | null> {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to fetch config");
    }
    const data = await response.json();
    return data.config;
  } catch (error) {
    console.error("Failed to fetch config:", error);
    return null;
  }
}

export async function saveConfig(
  config: CrossSeedConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to save config" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function updateConfigPartial(
  updates: Partial<CrossSeedConfig>
): Promise<{ success: boolean; error?: string; config?: CrossSeedConfig }> {
  try {
    const response = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to update config" };
    }

    return { success: true, config: data.config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
