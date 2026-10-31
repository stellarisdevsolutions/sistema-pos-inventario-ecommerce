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
  Truck,
  Plus,
  Search,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Building2,
  FileText,
} from "lucide-react";

const purchaseHistory = [
  {
    id: "COM-2026-081",
    invoiceNumber: "FAC-9842",
    supplier: "Distribuidora Tech Global S.A.",
    itemsCount: 45,
    total: 3820.0,
    date: "28 Oct 2026",
    status: "received",
  },
  {
    id: "COM-2026-080",
    invoiceNumber: "FAC-1234",
    supplier: "Audio & Componentes de Precisión",
    itemsCount: 30,
    total: 2160.0,
    date: "25 Oct 2026",
    status: "received",
  },
  {
    id: "COM-2026-079",
    invoiceNumber: "FAC-4412",
    supplier: "Importadora Gaming Gear",
    itemsCount: 15,
    total: 1450.0,
    date: "20 Oct 2026",
    status: "received",
  },
];

export default function ComprasPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = purchaseHistory.filter(
    (p) =>
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header con Título y Botón Registrar Compra */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Compras & Entradas de Stock
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de facturas de proveedores para sumar existencias y fijar costos unitarios.
          </p>
        </div>

        {/* Modal Registrar Compra */}
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
            <span>+ Registrar Compra</span>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-xl">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-lg font-black text-slate-900">
                Ingreso de Mercadería de Proveedor
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Esta acción aumentará el stock disponible en inventario y actualizará el costo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Proveedor *</label>
                <select className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]">
                  <option>Distribuidora Tech Global S.A.</option>
                  <option>Audio & Componentes de Precisión</option>
                  <option>Importadora Gaming Gear</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">N° de Factura / Guía *</label>
                <Input
                  placeholder="Ej. FAC-99120"
                  className="h-9 text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                />
              </div>

              <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">
                  Artículos Ingresados
                </span>
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <div className="sm:col-span-6">
                      <label className="text-[10px] font-bold text-slate-500">Producto</label>
                      <select className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800">
                        <option>GadgetHub Watch X1 Pro</option>
                        <option>SoundCore Elite Earbuds Pro</option>
                        <option>Teclado Mecánico RGB Wireless</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500">Cantidad</label>
                      <Input
                        type="number"
                        defaultValue="10"
                        className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500">Costo Unit. ($)</label>
                      <Input
                        type="number"
                        defaultValue="55.00"
                        className="h-8 text-xs rounded-lg border-slate-200 bg-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Notas u Observaciones</label>
                <Input
                  placeholder="Condiciones de pago, entrega, garantía..."
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 pt-3 border-t border-slate-100">
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
                Guardar e Incrementar Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 3 Bento Cards de Compras */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              Inversión en Compras (Mes)
            </span>
            <div className="h-7 w-7 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              $7,430.00
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">8 facturas procesadas</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              Proveedores Frecuentes
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              6 Empresas
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Con convenios de entrega</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              Unidades Ingresadas
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              +32%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              185 u.
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Reposición óptima de stock</p>
          </div>
        </div>
      </div>

      {/* Historial de Facturas de Compra */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registro de Facturas</h2>
            <p className="text-xs text-slate-500">
              Historial de compras y recepción física de mercadería
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por factura o proveedor..."
              className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">N° Factura</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-center">Unidades</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.id}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{p.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{p.supplier}</td>
                  <td className="py-3.5 px-4 text-slate-500">{p.date}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {p.itemsCount}
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900">${p.total.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Recibida en Almacén
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
