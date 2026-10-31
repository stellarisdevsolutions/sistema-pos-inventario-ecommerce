"use client";

import { SidebarProvider } from "@/context/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[var(--admin-workspace-bg)] text-slate-900 font-sans antialiased selection:bg-[var(--admin-accent)] selection:text-white">
        {/* Sidebar Lateral Pegado al Costado */}
        <Sidebar />

        {/* Área de Trabajo con Header */}
        <div className="flex flex-1 flex-col min-w-0 transition-all duration-300">
          <MobileNav />
          <Header />
          <main className="flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-6 w-full mx-auto max-w-[1600px]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
