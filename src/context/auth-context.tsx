"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { SessionUser } from "@/lib/auth/session-edge";
import { getCurrentUserAction, logoutAction } from "@/app/admin/actions/auth";
import { toast } from "sonner";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getCurrentUserAction();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUser) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getCurrentUserAction();
        if (cancelled) return;
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  const logout = async () => {
    try {
      const result = await logoutAction();
      if (!result.success) throw new Error("No se pudo cerrar la sesión.");
      setUser(null);
      toast.success("Has cerrado sesión exitosamente.");
      // Descarta también los datos del panel que Next conserva al navegar.
      window.location.replace("/portal");
    } catch {
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
