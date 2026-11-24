"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { AuthProvider } from "@/context/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

function AccessDeniedListener() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("denied") === "1") {
      toast.error("Acceso Denegado", {
        description: "Tu rol de usuario no tiene permisos para acceder al módulo solicitado.",
      });
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("denied");
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [searchParams, pathname, router]);

  return null;
}

function AdminFrame({ children }: { children: React.ReactNode }) {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className="admin-frame">
      <div className="admin-rail-desktop">
        <Suspense fallback={null}><Sidebar collapsed={isCollapsed} /></Suspense>
      </div>
      <div className="admin-workspace">
        <Suspense fallback={null}><Header collapsed={isCollapsed} onToggleSidebar={toggleSidebar} /></Suspense>
        <main className="admin-main">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Suspense fallback={null}><AccessDeniedListener /></Suspense>
        <AdminFrame>{children}</AdminFrame>
      </SidebarProvider>
    </AuthProvider>
  );
}
