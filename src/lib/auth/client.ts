"use client";

import { create } from "zustand";

interface User {
  id: number;
  username: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authDisabled: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAuthDisabled: (disabled: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authDisabled: false,
  setUser: (user) => set({ user }),
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAuthDisabled: (disabled) => set({ authDisabled: disabled }),
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, isAuthenticated: false });
  },
}));

export async function checkAuth(): Promise<{
  authenticated: boolean;
  authDisabled: boolean;
  user: User | null;
}> {
  try {
    const response = await fetch("/api/auth/session");
    const data = await response.json();

    return {
      authenticated: data.authenticated,
      authDisabled: data.authDisabled || false,
      user: data.user || null,
    };
  } catch {
    return {
      authenticated: false,
      authDisabled: false,
      user: null,
    };
  }
}

export async function checkSetupRequired(): Promise<{
  setupRequired: boolean;
  authDisabled: boolean;
}> {
  try {
    const response = await fetch("/api/auth/setup");
    const data = await response.json();

    return {
      setupRequired: data.setupRequired,
      authDisabled: data.authDisabled || false,
    };
  } catch {
    return {
      setupRequired: false,
      authDisabled: false,
    };
  }
}

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Login failed" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function setup(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Setup failed" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}
