"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SidebarProvider } from "@/context/sidebar-context";
import { AuthProvider } from "@/context/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";

function AccessDeniedListener() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("denied") === "1") {
      toast.error("Acceso Denegado", {
        description: "Tu rol de usuario no tiene permisos para acceder al módulo solicitado.",
      });
    }
  }, [searchParams]);
  return null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Suspense fallback={null}>
          <AccessDeniedListener />
        </Suspense>
        <div className="flex min-h-screen bg-[var(--admin-workspace-bg)] text-slate-900 font-sans antialiased selection:bg-[var(--admin-accent)] selection:text-white overflow-x-hidden">
          {/* Sidebar Flotante Isla / Dock */}
          <Suspense fallback={<aside className="hidden lg:flex w-20 shrink-0" />}>
            <Sidebar />
          </Suspense>

          {/* Área de Trabajo con Header Flotante */}
          <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
            <Suspense fallback={null}>
              <MobileNav />
            </Suspense>
            <Header />
            <main className="flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-6 w-full mx-auto max-w-[1600px]">
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
