"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  Truck,
  ExternalLink,
} from "lucide-react";

const suppliersList = [
  {
    id: 1,
    name: "Distribuidora Tech Global S.A.",
    contactName: "Luis Alarcón",
    email: "ventas@techglobal.com",
    phone: "+52 55 1234 5678",
    address: "Av. Industrial 402, Zona Centro",
    purchasesCount: 14,
    totalPurchased: "$18,450.00",
  },
  {
    id: 2,
    name: "Audio & Componentes de Precisión",
    contactName: "Marta Rivas",
    email: "contacto@audioprecision.com",
    phone: "+52 55 8765 4321",
    address: "Parque Industrial Norte, Bodega 12",
    purchasesCount: 8,
    totalPurchased: "$11,920.00",
  },
  {
    id: 3,
    name: "Importadora Gaming Gear",
    contactName: "Kevin Zhang",
    email: "pedidos@gaminggear.com",
    phone: "+52 55 9988 7766",
    address: "Blvd. Logístico 89",
    purchasesCount: 5,
    totalPurchased: "$6,300.00",
  },
];

export default function ProveedoresPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSuppliers = suppliersList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header con Título y Botón */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Directorio de Proveedores
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Empresas asociadas, contactos comerciales y acuerdos de distribución.
          </p>
        </div>

        {/* Modal Nuevo Proveedor */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                className="h-10 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold gap-2 shadow-md shadow-[#0284c7]/20 active:scale-95 transition-all w-full sm:w-auto"
              />
            }
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Nuevo Proveedor</span>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-xl">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-lg font-black text-slate-900">
                Registrar Nuevo Proveedor
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Registra la razón social y los datos de contacto directo para órdenes de compra.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Razón Social / Empresa *</label>
                <Input
                  placeholder="Ej. Distribuciones Alfa S.A."
                  className="h-9 text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nombre de Contacto</label>
                <Input
                  placeholder="Ej. Juan Pérez"
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Teléfono</label>
                  <Input
                    placeholder="+52 55..."
                    className="h-9 text-xs rounded-xl border-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Correo Electrónico</label>
                  <Input
                    type="email"
                    placeholder="contacto@..."
                    className="h-9 text-xs rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Dirección o Bodega</label>
                <Input
                  placeholder="Calle, número, ciudad"
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="h-9 rounded-xl border-slate-200 text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="h-9 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md shadow-[#0284c7]/20"
              >
                Guardar Proveedor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar proveedor por empresa o persona de contacto..."
          className="pl-9 h-10 text-xs rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
        />
      </div>

      {/* Grid de Proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-[#0284c7]/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">
                      {supplier.name}
                    </h2>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Contacto: {supplier.contactName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] font-semibold">{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-[11px]">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] truncate">{supplier.address}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Total Comprado
                </span>
                <span className="text-xs font-black text-slate-900">
                  {supplier.totalPurchased}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg gap-1 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white"
              >
                <Truck className="h-3 w-3 text-[#0284c7]" />
                <span>Nueva Orden</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
