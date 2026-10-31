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
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Store,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock de Cajas Físicas
const initialRegisters = [
  {
    id: 1,
    name: "Caja 1 - Mostrador Principal",
    code: "POS-01",
    location: "Planta Baja - Salón de Ventas",
    status: "active",
    activeShift: {
      shiftNumber: "TURNO-2026-001",
      cashier: "Sofía Cajera",
      openedAt: "Hoy, 08:30 AM",
      initialCash: 150.0,
      cashSales: 485.5,
      cardSales: 620.0,
      transferSales: 180.0,
      expectedCash: 635.5, // 150 + 485.50
    },
  },
  {
    id: 2,
    name: "Caja 2 - Terminal Express",
    code: "POS-02",
    location: "Sector Accesorios",
    status: "closed",
    activeShift: null,
  },
];

// Mock de Historial de Turnos Cerrados (Arqueos)
const closedShifts = [
  {
    id: 101,
    shiftNumber: "TURNO-2026-080",
    registerCode: "POS-01",
    cashier: "Lucas Almacenero",
    supervisor: "Martín Supervisor",
    openedAt: "29 Oct, 08:30 AM",
    closedAt: "29 Oct, 08:00 PM",
    initialCash: 150.0,
    cashSales: 790.0,
    expectedCash: 940.0,
    actualCash: 940.0,
    difference: 0.0,
    status: "balanced", // Cuadrado perfecto
  },
  {
    id: 100,
    shiftNumber: "TURNO-2026-079",
    registerCode: "POS-01",
    cashier: "Sofía Cajera",
    supervisor: "Martín Supervisor",
    openedAt: "28 Oct, 08:30 AM",
    closedAt: "28 Oct, 08:15 PM",
    initialCash: 150.0,
    cashSales: 620.0,
    expectedCash: 770.0,
    actualCash: 768.0,
    difference: -2.0,
    status: "shortage", // Faltante menor
  },
  {
    id: 99,
    shiftNumber: "TURNO-2026-078",
    registerCode: "POS-02",
    cashier: "Sofía Cajera",
    supervisor: "Administrador General",
    openedAt: "27 Oct, 09:00 AM",
    closedAt: "27 Oct, 06:30 PM",
    initialCash: 100.0,
    cashSales: 410.0,
    expectedCash: 510.0,
    actualCash: 511.5,
    difference: 1.5,
    status: "surplus", // Sobrante
  },
];

export default function CajasPage() {
  const [activeTab, setActiveTab] = useState<"registers" | "history">("registers");
  const [isClosingShiftOpen, setIsClosingShiftOpen] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState<string>("635.50");
  const [supervisorNote, setSupervisorNote] = useState("");

  const activeShift = initialRegisters[0].activeShift!;
  const countedNum = parseFloat(actualCashCounted) || 0;
  const difference = countedNum - activeShift.expectedCash;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header con Estilo Finnova */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Control de Cajas & Arqueos
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
              Multi-Terminal POS
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión de turnos de cobro, conciliación de efectivo en caja y auditoría de arqueos ciegos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón para Abrir Modal de Arqueo / Cierre */}
          <Dialog open={isClosingShiftOpen} onOpenChange={setIsClosingShiftOpen}>
            <DialogTrigger
              render={
                <Button
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                />
              }
            >
              <Banknote className="h-4 w-4" />
              <span>Realizar Arqueo / Cierre de Turno</span>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
              <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Arqueo Ciego & Cierre de Caja
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Turno #{activeShift.shiftNumber} — Operado por {activeShift.cashier} en POS-01.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Desglose de Ventas del Turno */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Fondo Inicial:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">${activeShift.initialCash.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Ventas Efectivo:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">+${activeShift.cashSales.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Ventas Tarjeta:</span>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">${activeShift.cardSales.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Efectivo Esperado:</span>
                    <p className="font-black text-slate-900 dark:text-white text-sm">${activeShift.expectedCash.toFixed(2)}</p>
                  </div>
                </div>

                {/* Input de Conteo Físico Real */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dinero Físico en Gaveta (Contado por el cajero):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-8 h-11 text-base font-black rounded-xl border-slate-200 dark:border-slate-700 focus:border-indigo-600"
                      value={actualCashCounted}
                      onChange={(e) => setActualCashCounted(e.target.value)}
                    />
                  </div>
                </div>

                {/* Verificación de Cuadre */}
                <div
                  className={cn(
                    "p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-colors",
                    Math.abs(difference) < 0.01
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : difference > 0
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {Math.abs(difference) < 0.01 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>
                      {Math.abs(difference) < 0.01
                        ? "¡Caja Cuadrada Perfecta!"
                        : difference > 0
                        ? `Sobrante de dinero: +$${difference.toFixed(2)}`
                        : `Faltante de dinero: -$${Math.abs(difference).toFixed(2)}`}
                    </span>
                  </div>
                  <span className="text-sm font-black">
                    {difference === 0 ? "$0.00" : `${difference > 0 ? "+" : ""}$${difference.toFixed(2)}`}
                  </span>
                </div>

                {/* Observaciones del Supervisor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Firma / Observación del Supervisor (Martín):
                  </label>
                  <Input
                    placeholder="Ej. Conforme con el recuento sin discrepancias..."
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                    value={supervisorNote}
                    onChange={(e) => setSupervisorNote(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-10 text-xs font-bold"
                  onClick={() => setIsClosingShiftOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => {
                    setIsClosingShiftOpen(false);
                    alert("Turno cerrado con éxito. Arqueo auditado y archivado.");
                  }}
                >
                  Confirmar y Cerrar Turno
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 2. KPIs de Control Financiero (Estilo Finnova) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Fondo Inicial Activo</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$150.00</span>
            <p className="text-[11px] text-slate-400 mt-0.5">En gaveta (Caja 1)</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Ventas Efectivo Hoy</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$485.50</span>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">+18 tickets cobrados</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Ventas Tarjeta / QR</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$800.00</span>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">62% del volumen total</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Auditoría de Arqueos</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">99.8%</span>
            <p className="text-[11px] text-blue-600 font-bold mt-0.5">Precisión en cierres</p>
          </div>
        </div>
      </div>

      {/* 3. Selector de Pestañas Finnova */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 w-fit">
        <button
          onClick={() => setActiveTab("registers")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all",
            activeTab === "registers"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
        >
          Terminales POS & Turno Activo
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all",
            activeTab === "history"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
        >
          Historial de Arqueos Auditados
        </button>
      </div>

      {/* 4. Contenido según pestaña */}
      {activeTab === "registers" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Caja 1: Turno Abierto (Signature Bento Dark Container) */}
          <div className="rounded-3xl p-6 bg-[#11162b] border border-[#1e2648] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Caja 1 - Mostrador Principal</h3>
                    <p className="text-[11px] text-slate-400">Terminal POS-01 • Salón Principal</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold text-xs gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Turno Abierto
                </Badge>
              </div>

              {/* Info del Cajero */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-black">
                    SC
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">Sofía Cajera</p>
                    <p className="text-[10px] text-slate-400">Apertura: Hoy, 08:30 AM</p>
                  </div>
                </div>
                <span className="font-mono text-slate-400 text-xs">TURNO-2026-001</span>
              </div>

              {/* Métricas del turno activo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fondo</span>
                  <p className="text-base font-black text-slate-200 mt-0.5">${activeShift.initialCash.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efectivo</span>
                  <p className="text-base font-black text-emerald-400 mt-0.5">${activeShift.cashSales.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tarjetas</span>
                  <p className="text-base font-black text-indigo-400 mt-0.5">${activeShift.cardSales.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/80">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Esperado</span>
                  <p className="text-base font-black text-white mt-0.5">${activeShift.expectedCash.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                onClick={() => setIsClosingShiftOpen(true)}
                className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Banknote className="h-4 w-4" />
                Cerrar Turno & Proceder al Arqueo
              </Button>
            </div>
          </div>

          {/* Caja 2: Terminal Express Cerrada */}
          <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">Caja 2 - Terminal Express</h3>
                    <p className="text-[11px] text-slate-500">Terminal POS-02 • Sector Accesorios</p>
                  </div>
                </div>
                <Badge variant="outline" className="font-bold text-xs text-slate-400">
                  Sin Turno Activo
                </Badge>
              </div>

              <div className="py-8 text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Terminal lista para nueva jornada
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cualquier cajero con credenciales puede iniciar un turno ingresando el fondo de caja inicial.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl font-bold text-xs gap-2 border-indigo-200 text-indigo-600 dark:border-indigo-800 hover:bg-indigo-50"
              onClick={() => alert("Función para abrir nuevo turno en Caja 2")}
            >
              <Plus className="h-4 w-4" />
              Abrir Turno en Terminal 2
            </Button>
          </div>
        </div>
      ) : (
        /* Pestaña: Historial de Arqueos Auditados */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Turno / Caja</th>
                  <th className="py-3 px-4">Cajero</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Apertura / Cierre</th>
                  <th className="py-3 px-4 text-right">Efectivo Esperado</th>
                  <th className="py-3 px-4 text-right">Efectivo Contado</th>
                  <th className="py-3 px-4 text-right">Diferencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {closedShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-900 dark:text-white">{shift.shiftNumber}</span>
                      <p className="text-[10px] text-slate-400">{shift.registerCode}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold">{shift.cashier}</td>
                    <td className="py-3.5 px-4 text-slate-500">{shift.supervisor}</td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                      <div>{shift.openedAt}</div>
                      <div className="text-slate-400">{shift.closedAt}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">${shift.expectedCash.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">${shift.actualCash.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      <span
                        className={
                          shift.difference === 0
                            ? "text-emerald-600"
                            : shift.difference > 0
                            ? "text-blue-600"
                            : "text-rose-600"
                        }
                      >
                        {shift.difference === 0
                          ? "$0.00"
                          : `${shift.difference > 0 ? "+" : ""}$${shift.difference.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5",
                          shift.status === "balanced"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : shift.status === "surplus"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
                        )}
                      >
                        {shift.status === "balanced"
                          ? "Cuadrado"
                          : shift.status === "surplus"
                          ? "Sobrante"
                          : "Faltante"}
                      </Badge>
                    </td>
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
