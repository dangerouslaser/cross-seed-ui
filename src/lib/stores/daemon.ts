"use client";

import { create } from "zustand";

export type DaemonConnectionStatus = "connected" | "disconnected" | "error" | "checking";

interface DaemonState {
  status: DaemonConnectionStatus;
  version: string | null;
  error: string | null;
  lastCheck: Date | null;
  configured: boolean;
  url: string | null;

  setStatus: (status: DaemonConnectionStatus) => void;
  setVersion: (version: string | null) => void;
  setError: (error: string | null) => void;
  setLastCheck: (date: Date) => void;
  setConfigured: (configured: boolean) => void;
  setUrl: (url: string | null) => void;
}

export const useDaemonStore = create<DaemonState>((set) => ({
  status: "checking",
  version: null,
  error: null,
  lastCheck: null,
  configured: false,
  url: null,

  setStatus: (status) => set({ status }),
  setVersion: (version) => set({ version }),
  setError: (error) => set({ error }),
  setLastCheck: (date) => set({ lastCheck: date }),
  setConfigured: (configured) => set({ configured }),
  setUrl: (url) => set({ url }),
}));

export async function checkDaemonStatus(): Promise<void> {
  const store = useDaemonStore.getState();
  store.setStatus("checking");

  try {
    const response = await fetch("/api/daemon/status");
    const data = await response.json();

    store.setConfigured(data.configured ?? false);
    store.setUrl(data.url ?? null);
    store.setLastCheck(new Date());

    if (data.running) {
      store.setStatus("connected");
      store.setVersion(data.version ?? null);
      store.setError(null);
    } else if (data.error) {
      store.setStatus("error");
      store.setError(data.error);
      store.setVersion(null);
    } else {
      store.setStatus("disconnected");
      store.setError(null);
      store.setVersion(null);
    }
  } catch (error) {
    store.setStatus("error");
    store.setError(error instanceof Error ? error.message : "Failed to check status");
    store.setVersion(null);
  }
}
