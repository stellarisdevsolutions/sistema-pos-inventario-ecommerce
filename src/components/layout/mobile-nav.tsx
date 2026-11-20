"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="admin-header-button" aria-label="Abrir navegación">
          <Menu size={17} aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="admin-drawer gap-0 border-0 p-0 lg:hidden">
          <SheetTitle className="sr-only">Navegación del panel</SheetTitle>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
