"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Boxes,
  CheckCircle2,
  ArrowUpRight,
  BookOpen,
  FileSpreadsheet,
  ShieldAlert,
  ArrowDownRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data de Productos
const initialProducts = [
  {
    id: 1,
    name: "GadgetHub Watch X1 Pro",
    sku: "WAT-X1-PRO",
    barcode: "750100234501",
    category: "Smartwatches",
    price: 199.99,
    costPrice: 95.0,
    stock: 3,
    minStock: 8,
    status: "low_stock",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    barcode: "750100234502",
    category: "Audio",
    price: 129.9,
    costPrice: 55.0,
    stock: 24,
    minStock: 6,
    status: "in_stock",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Teclado Mecánico RGB Wireless",
    sku: "KEY-RGB-WL",
    barcode: "750100234503",
    category: "Gaming",
    price: 89.0,
    costPrice: 38.0,
    stock: 2,
    minStock: 10,
    status: "low_stock",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Base de Carga Rápida Qi 3 en 1",
    sku: "CHG-QI-03",
    barcode: "750100234504",
    category: "Accesorios",
    price: 49.99,
    costPrice: 19.0,
    stock: 0,
    minStock: 12,
    status: "out_of_stock",
    image: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    name: "Cámara Ultra 4K Creator Kit",
    sku: "CAM-4K-KIT",
    barcode: "750100234505",
    category: "Video",
    price: 349.0,
    costPrice: 180.0,
    stock: 15,
    minStock: 4,
    status: "in_stock",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=150&auto=format&fit=crop&q=80",
  },
];

// Mock Data de Kardex (Libro Mayor Inmutable)
const kardexMovements = [
  {
    id: 501,
    date: "Hoy, 11:20 AM",
    product: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    type: "sale_out",
    typeLabel: "Venta en Mostrador",
    quantity: -1,
    previousStock: 25,
    newStock: 24,
    unitCost: 55.0,
    reference: "Ticket VTA-2026-1001",
    user: "Sofía Cajera",
  },
  {
    id: 502,
    date: "Hoy, 09:45 AM",
    product: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    type: "damaged_out",
    typeLabel: "Baja por Daño Físico",
    quantity: -1,
    previousStock: 26,
    newStock: 25,
    unitCost: 55.0,
    reference: "Acta BAJA-2026-001",
    user: "Lucas Almacenero",
  },
  {
    id: 503,
    date: "Ayer, 04:30 PM",
    product: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    type: "purchase_in",
    typeLabel: "Recepción de Compra",
    quantity: 20,
    previousStock: 6,
    newStock: 26,
    unitCost: 55.0,
    reference: "Factura COM-2026-081",
    user: "Lucas Almacenero",
  },
  {
    id: 504,
    date: "Ayer, 02:15 PM",
    product: "Teclado Mecánico RGB Wireless",
    sku: "KEY-RGB-WL",
    type: "sale_out",
    typeLabel: "Venta en Mostrador",
    quantity: -2,
    previousStock: 4,
    newStock: 2,
    unitCost: 38.0,
    reference: "Ticket VTA-2026-0998",
    user: "Sofía Cajera",
  },
];

// Mock Data de Bajas / Mermas
const initialAdjustments = [
  {
    id: 301,
    adjustmentNumber: "BAJA-2026-001",
    date: "Hoy, 09:45 AM",
    productName: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    quantity: 1,
    reason: "damaged",
    reasonLabel: "Rotura física en transporte",
    totalLoss: 55.0,
    reportedBy: "Lucas Almacenero",
    authorizedBy: "Martín Supervisor",
    notes: "Auricular izquierdo quebrado por golpe en descarga de camión",
  },
  {
    id: 300,
    adjustmentNumber: "BAJA-2026-000",
    date: "26 Oct, 03:00 PM",
    productName: "Base de Carga Rápida Qi 3 en 1",
    sku: "CHG-QI-03",
    quantity: 1,
    reason: "defective",
    reasonLabel: "Defecto de fábrica (No enciende)",
    totalLoss: 19.0,
    reportedBy: "Sofía Cajera",
    authorizedBy: "Administrador General",
    notes: "Cliente reportó falla al abrir caja; derivado a reclamo de garantía con proveedor",
  },
];

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "kardex" | "adjustments">("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Filtrado de productos
  const filteredProducts = initialProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStock === "low") return p.status === "low_stock";
    if (filterStock === "out") return p.status === "out_of_stock";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Finnova */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Inventario & Control de Stock
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
              Kardex & Mermas
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Existencias físicas, auditoría contable inmutable de entradas/salidas y actas de baja por productos dañados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón para Registrar Baja por Daño */}
          <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold gap-2 active:scale-95 transition-all"
                />
              }
            >
              <ShieldAlert className="h-4 w-4" />
              <span>+ Dar de Baja Producto</span>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
              <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  Acta de Baja por Daño o Defecto
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Descontará unidades del stock vendible y registrará la salida en el Kardex.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Producto a dar de baja:</label>
                  <select className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                    <option>SoundCore Elite Earbuds Pro (AUD-EAR-PRO) - Stock: 24</option>
                    <option>GadgetHub Watch X1 Pro (WAT-X1-PRO) - Stock: 3</option>
                    <option>Teclado Mecánico RGB Wireless (KEY-RGB-WL) - Stock: 2</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Cantidad:</label>
                    <Input type="number" defaultValue="1" className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Motivo formal:</label>
                    <select className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                      <option value="damaged">Rotura / Daño físico</option>
                      <option value="defective">Defecto de fábrica</option>
                      <option value="expired">Vencimiento / Caducidad</option>
                      <option value="loss_theft">Merma por auditoría</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Justificación detallada:</label>
                  <Input placeholder="Ej. Embalaje aplastado durante descarga..." className="h-10 rounded-xl" />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-10 text-xs font-bold"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl h-10 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    setIsAdjustmentModalOpen(false);
                    alert("Acta de baja registrada con éxito. Stock descontado y asentado en Kardex.");
                  }}
                >
                  Confirmar Baja de Stock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Botón Nuevo Producto */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger
              render={
                <Button
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                />
              }
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Nuevo Producto</span>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
              <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                  Registrar Nuevo Producto
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Agrega un nuevo artículo con su código de barras para venta en caja POS.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nombre del Producto:</label>
                  <Input placeholder="Ej. Parlante Bluetooth IPX7" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Código SKU:</label>
                  <Input placeholder="AUD-SPK-04" className="h-10 rounded-xl font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Código de Barras (Lector POS):</label>
                  <Input placeholder="7790012345674" className="h-10 rounded-xl font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Precio de Venta ($):</label>
                  <Input type="number" placeholder="59.90" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Precio de Costo ($):</label>
                  <Input type="number" placeholder="32.00" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Stock Inicial:</label>
                  <Input type="number" placeholder="35" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Umbral Mínimo de Alerta:</label>
                  <Input type="number" placeholder="8" className="h-10 rounded-xl" />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <Button variant="outline" size="sm" className="rounded-xl h-10 font-bold" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" className="rounded-xl h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => setIsDialogOpen(false)}>
                  Guardar Producto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 2. KPIs de Inventario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Valorización de Inventario</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$4,860.00</span>
            <p className="text-[11px] text-slate-400 mt-0.5">En costo de adquisición</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Unidades en Almacén</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">44 unidades</span>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">5 categorías activas</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Bajo Stock Crítico</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600">2 productos</span>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">Requieren orden de compra</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Mermas / Pérdidas del Mes</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-600">$74.00</span>
            <p className="text-[11px] text-rose-600 font-bold mt-0.5">2 bajas auditadas</p>
          </div>
        </div>
      </div>

      {/* 3. Selector de Pestañas Finnova */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 w-fit">
        <button
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
            activeTab === "catalog"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
        >
          <Package className="h-4 w-4" />
          <span>Catálogo & Stock en Almacén</span>
        </button>
        <button
          onClick={() => setActiveTab("kardex")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
            activeTab === "kardex"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>KARDEX (Libro Mayor)</span>
        </button>
        <button
          onClick={() => setActiveTab("adjustments")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
            activeTab === "adjustments"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Bajas & Mermas por Daño</span>
        </button>
      </div>

      {/* 4. Contenido según pestaña */}
      {activeTab === "catalog" ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Barra de Filtros */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, SKU o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant={filterStock === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStock("all")}
                className="rounded-xl text-xs font-bold h-9"
              >
                Todos
              </Button>
              <Button
                variant={filterStock === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStock("low")}
                className="rounded-xl text-xs font-bold h-9 text-amber-600"
              >
                Bajo Stock
              </Button>
              <Button
                variant={filterStock === "out" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStock("out")}
                className="rounded-xl text-xs font-bold h-9 text-rose-600"
              >
                Agotados
              </Button>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Producto / Identificadores</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Costo Unitario</th>
                  <th className="py-3 px-4 text-center">Stock / Mínimo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>SKU: {p.sku}</span>
                          <span>•</span>
                          <span>Bar: {p.barcode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-semibold text-[10px] text-slate-600">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      ${p.costPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn("font-black text-sm", p.stock <= p.minStock ? "text-amber-600" : "text-slate-800 dark:text-slate-200")}>
                        {p.stock}
                      </span>
                      <span className="text-[10px] text-slate-400"> / mín {p.minStock}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5",
                          p.status === "in_stock"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "low_stock"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {p.status === "in_stock" ? "En Stock" : p.status === "low_stock" ? "Reponer" : "Agotado"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "kardex" ? (
        /* Pestaña: KARDEX */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Libro Mayor de Inventario (Kardex)</h3>
              <p className="text-xs text-slate-400">Historial inmutable con respaldo de tickets, compras y actas.</p>
            </div>
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              Trazabilidad 100%
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4 text-center">Saldo Ant. ➜ Nuevo</th>
                  <th className="py-3 px-4 text-right">Costo Unit.</th>
                  <th className="py-3 px-4">Comprobante Referencia</th>
                  <th className="py-3 px-4">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {kardexMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{m.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {m.product}
                      <p className="text-[10px] text-slate-400 font-mono">{m.sku}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold",
                          m.type === "purchase_in"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : m.type === "sale_out"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {m.typeLabel}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-black">
                      <span className={m.quantity > 0 ? "text-emerald-600" : "text-slate-800 dark:text-slate-200"}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-slate-400">{m.previousStock}</span>
                      <span className="mx-1.5 text-slate-300">➜</span>
                      <span className="font-bold text-slate-900 dark:text-white">{m.newStock}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">${m.unitCost.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">{m.reference}</td>
                    <td className="py-3 px-4 font-bold text-[11px]">{m.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pestaña: Bajas & Mermas por Daño */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Actas de Baja & Productos Dañados</h3>
              <p className="text-xs text-slate-400">Control de mermas, productos rotos y garantías de fábrica.</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Baja</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Folio Acta</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Producto Afectado</th>
                  <th className="py-3 px-4">Motivo / Causa</th>
                  <th className="py-3 px-4 text-center">Unidades</th>
                  <th className="py-3 px-4 text-right">Pérdida Monetaria</th>
                  <th className="py-3 px-4">Reportado Por</th>
                  <th className="py-3 px-4">Autorizado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {initialAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-rose-600">{a.adjustmentNumber}</td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">{a.date}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{a.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{a.sku}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                        {a.reasonLabel}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-0.5">{a.notes}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black">{a.quantity} ud</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600">${a.totalLoss.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-bold">{a.reportedBy}</td>
                    <td className="py-3.5 px-4 text-indigo-600 font-bold">{a.authorizedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
