"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  isMounted: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SIDEBAR_STORAGE_KEY = "admin_sidebar_collapsed";
const subscribeNoop = () => () => {};

function subscribeSidebarStore(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SIDEBAR_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("aura-sidebar-change", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("aura-sidebar-change", callback);
  };
}

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const isCollapsed = useSyncExternalStore(
    subscribeSidebarStore,
    getSidebarSnapshot,
    () => false
  );

  const toggleSidebar = () => {
    const next = !getSidebarSnapshot();
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("aura-sidebar-change"));
    }
  };

  const setCollapsed = (collapsed: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("aura-sidebar-change"));
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMounted,
        toggleSidebar,
        setCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
