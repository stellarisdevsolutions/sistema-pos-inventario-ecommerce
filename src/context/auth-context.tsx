"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    if (!initialUser) {
      refreshUser();
    }
  }, [initialUser, refreshUser]);

  const logout = async () => {
    try {
      const result = await logoutAction();
      if (!result.success) throw new Error("No se pudo cerrar la sesión.");
      setUser(null);
      toast.success("Has cerrado sesión exitosamente.");
      router.push("/portal");
      router.refresh();
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
