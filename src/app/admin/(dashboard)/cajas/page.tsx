"use client";

import Link from "next/link";
import { MetricCard } from "@/components/admin/metric-card";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
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
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  Building2,
  DollarSign,
  Wallet,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, CURRENCY_NAME, formatCurrency, formatCurrencyLocale } from "@/lib/currency";
import { useAuth } from "@/context/auth-context";
import {
  getCashRegistersAndShiftsAction,
  getClosedShiftsHistoryAction,
  openShiftAction,
  closeShiftAction,
  submitCashCountAction,
  createCashRegisterAction,
  getShiftSalesAction,
  type CashRegisterItem,
  type ClosedShiftItem,
  type CashKpisSummary,
  type UserOption,
  type ActiveShiftDetail,
  type ShiftSaleDetail,
} from "@/app/admin/actions/cash-shifts";

export default function CajasPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"registers" | "history">("registers");

  // Estado de cajas y turnos activos
  const [registers, setRegisters] = useState<CashRegisterItem[]>([]);
  const [kpis, setKpis] = useState<CashKpisSummary>({
    activeInitialCash: 0,
    todayCashSales: 0,
    todayCardTransferSales: 0,
    auditPrecisionPercent: 100,
    activeShiftsCount: 0,
    totalRegistersCount: 0,
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(true);

  // Estado de historial de arqueos cerrados
  const [closedShifts, setClosedShifts] = useState<ClosedShiftItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  // Modal: {shiftToClose?.review ? "Revisar y aprobar cierre" : "Registrar conteo de efectivo"}
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [shiftToClose, setShiftToClose] = useState<ActiveShiftDetail | null>(null);
  const [actualCashCounted, setActualCashCounted] = useState<string>("");
  const [supervisorNote, setSupervisorNote] = useState("");
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Modal: Apertura de Turno
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [selectedRegisterToOpen, setSelectedRegisterToOpen] = useState<CashRegisterItem | null>(null);
  const [selectedCashierId, setSelectedCashierId] = useState<number>(0);
  const [initialCashInput, setInitialCashInput] = useState<string>("150.00");
  const [openNotes, setOpenNotes] = useState("");
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  // Modal: Nueva Caja Física
  const [createRegisterModalOpen, setCreateRegisterModalOpen] = useState(false);
  const [newRegisterName, setNewRegisterName] = useState("");
  const [newRegisterCode, setNewRegisterCode] = useState("");
  const [newRegisterLocation, setNewRegisterLocation] = useState("");
  const [isCreatingRegister, setIsCreatingRegister] = useState(false);

  // Modal: Ver Detalle de Arqueo Histórico
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClosedShift, setSelectedClosedShift] = useState<ClosedShiftItem | null>(null);

  // Modal: Detalle de Tickets Vendidos en la Caja
  const [shiftSalesModalOpen, setShiftSalesModalOpen] = useState(false);
  const [shiftSalesData, setShiftSalesData] = useState<{
    shiftNumber: string;
    registerName: string;
    sales: ShiftSaleDetail[];
    totalRevenue: number;
    cashSalesTotal: number;
    electronicSalesTotal: number;
    ticketsCount: number;
  } | null>(null);
  const [isLoadingShiftSales, setIsLoadingShiftSales] = useState(false);

  const handleViewShiftSales = async (
    shiftId: number,
    shiftNumber: string,
    registerName: string
  ) => {
    setIsLoadingShiftSales(true);
    setShiftSalesModalOpen(true);
    setShiftSalesData({
      shiftNumber,
      registerName,
      sales: [],
      totalRevenue: 0,
      cashSalesTotal: 0,
      electronicSalesTotal: 0,
      ticketsCount: 0,
    });

    try {
      const res = await getShiftSalesAction(shiftId);
      if (res.success) {
        setShiftSalesData({
          shiftNumber,
          registerName,
          sales: res.sales,
          totalRevenue: res.totalRevenue,
          cashSalesTotal: res.cashSalesTotal,
          electronicSalesTotal: res.electronicSalesTotal,
          ticketsCount: res.ticketsCount,
        });
      } else {
        toast.error(res.error || "No se pudieron obtener las ventas de este turno.");
      }
    } catch {
      toast.error("Error al cargar las ventas del turno.");
    } finally {
      setIsLoadingShiftSales(false);
    }
  };

  // Cargar datos de cajas y turnos
  const loadRegistersData = async () => {
    setIsLoadingRegisters(true);
    try {
      const res = await getCashRegistersAndShiftsAction();
      if (res.success) {
        setRegisters(res.registers);
        setKpis(res.kpis);
        setUsers(res.users);


      } else {
        toast.error(res.error || "No se pudieron cargar las cajas.");
      }
    } catch {
      toast.error("Error al conectar con la base de datos de cajas.");
    } finally {
      setIsLoadingRegisters(false);
    }
  };

  // Cargar historial de arqueos cerrados
  const loadHistoryData = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getClosedShiftsHistoryAction();
      if (res.success) {
        setClosedShifts(res.data);
      } else {
        toast.error(res.error || "No se pudieron cargar los arqueos pasados.");
      }
    } catch {
      toast.error("Error al cargar historial de turnos.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadRegistersData();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistoryData();
    }
  }, [activeTab]);

  // Manejar apertura de turno
  const handleOpenShift = async () => {
    if (!selectedRegisterToOpen) return;
    const initialCashNum = parseFloat(initialCashInput) || 0;

    setIsOpeningShift(true);
    try {
      const res = await openShiftAction({
        cashRegisterId: selectedRegisterToOpen.id,
        userId: selectedCashierId,
        initialCash: initialCashNum,
        notes: openNotes.trim() || null,
      });

      if (res.success) {
        toast.success(`Turno abierto con éxito en ${selectedRegisterToOpen.name}`);
        setOpenShiftModalOpen(false);
        setSelectedRegisterToOpen(null);
        setOpenNotes("");
        loadRegistersData();
      } else {
        toast.error(res.error || "No se pudo abrir el turno.");
      }
    } catch {
      toast.error("Error al procesar la apertura de turno.");
    } finally {
      setIsOpeningShift(false);
    }
  };

  // Manejar arqueo y cierre de turno
  const handleCloseShift = async () => {
    if (!shiftToClose) return;

    const review = shiftToClose.review;
    if (review ? review.difference !== 0 && !supervisorNote.trim() : !actualCashCounted.trim()) {
      toast.error(review ? "Explica la diferencia para aprobar el cierre." : "Ingresa el efectivo contado.");
      return;
    }

    setIsClosingShift(true);
    try {
      const res = review
        ? await closeShiftAction({ shiftId: shiftToClose.id, notes: supervisorNote.trim() })
        : await submitCashCountAction({ shiftId: shiftToClose.id, actualCash: Number(actualCashCounted) });

      if (res.success) {
        toast.success(review ? "Cierre aprobado" : "Conteo enviado para revisión");
        setCloseShiftModalOpen(false);
        setShiftToClose(null);
        setActualCashCounted("");
        setSupervisorNote("");
        loadRegistersData();
        if (activeTab === "history") loadHistoryData();
      } else {
        toast.error(res.error || "No se pudo cerrar el turno.");
      }
    } catch {
      toast.error("Error al procesar el cierre de caja.");
    } finally {
      setIsClosingShift(false);
    }
  };

  // Manejar creación de nueva caja física
  const handleCreateRegister = async () => {
    if (!newRegisterName.trim() || !newRegisterCode.trim()) {
      toast.error("El nombre y código de la caja son obligatorios.");
      return;
    }

    setIsCreatingRegister(true);
    try {
      const res = await createCashRegisterAction({
        name: newRegisterName.trim(),
        code: newRegisterCode.trim().toUpperCase(),
        location: newRegisterLocation.trim() || null,
      });

      if (res.success) {
        toast.success(`Caja "${res.data.name}" creada exitosamente.`);
        setCreateRegisterModalOpen(false);
        setNewRegisterName("");
        setNewRegisterCode("");
        setNewRegisterLocation("");
        loadRegistersData();
      } else {
        toast.error(res.error || "No se pudo registrar la caja.");
      }
    } catch {
      toast.error("Error al crear la terminal.");
    } finally {
      setIsCreatingRegister(false);
    }
  };

  // Filtrado de Historial de Arqueos
  const filteredClosedShifts = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return closedShifts.filter((s) => {
      const matchesSearch =
        !q ||
        s.shiftNumber.toLowerCase().includes(q) ||
        s.registerName.toLowerCase().includes(q) ||
        s.registerCode.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.supervisorName.toLowerCase().includes(q);

      const matchesStatus =
        historyStatusFilter === "all" || s.status === historyStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [closedShifts, historySearch, historyStatusFilter]);

  const ownShift = user ? registers.find(register => register.activeShift?.userId === user.id)?.activeShift : null;
  const hasOwnOpenShift = Boolean(ownShift && !ownShift.pendingReview);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* =========================================================================
          1. HEADER CON BOTÓN DE NUEVA CAJA Y ARQUEO
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-page-title">Cajas y turnos</h1>
          </div>
          <p className="admin-page-description">Abre turnos, registra arqueos y consulta cierres.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasOwnOpenShift && (
            <Link href="/admin/ventas" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-admin-brand px-4 text-sm font-medium text-admin-on-solid hover:bg-admin-brand-hover">
              Ir al punto de venta
            </Link>
          )}
          {user && user.role !== "cashier" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewRegisterCode(`POS-0${registers.length + 1}`);
                setCreateRegisterModalOpen(true);
              }}
              className="h-10 px-3.5 rounded-xl border-admin-card-border text-xs font-bold gap-1.5 hover:bg-admin-raised cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Caja Física</span>
            </Button>
          )}

          {/* Botón rápido para refrescar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadRegistersData();
              if (activeTab === "history") loadHistoryData();
            }}
            disabled={isLoadingRegisters}
            className="h-10 px-3 rounded-xl border-admin-card-border text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingRegisters && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. KPIS FINANCIEROS DE CONTROL DE CAJAS
          ========================================================================= */}
      {user && user.role !== "cashier" && !registers.some(r => r.activeShift?.userId === user.id && !r.activeShift.pendingReview) && (
      <section className="admin-metrics" aria-label="Indicadores de cajas">
        <MetricCard
          label="Fondo inicial en gavetas"
          value={formatCurrency(kpis.activeInitialCash)}
          detail={`${kpis.activeShiftsCount} ${kpis.activeShiftsCount === 1 ? "caja abierta" : "cajas abiertas"}`}
          icon={Banknote}
        />
        <MetricCard
          label="Ventas en efectivo hoy"
          value={formatCurrency(kpis.todayCashSales)}
          detail="Dinero ingresado en turnos"
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard
          label="Ventas con tarjeta o QR"
          value={formatCurrency(kpis.todayCardTransferSales)}
          detail="Cobros electrónicos conciliados"
          icon={CreditCard}
        />
        <MetricCard
          label="Precisión de arqueos"
          value={`${kpis.auditPrecisionPercent}%`}
          detail="Cierres sin diferencias"
          icon={ShieldCheck}
        />
      </section>
      )}

      {/* =========================================================================
          3. SELECTOR DE PESTAÑAS (TERMINALES vs HISTORIAL)
          ========================================================================= */}
      <div className="admin-segments">
        <button
          onClick={() => setActiveTab("registers")}
          aria-pressed={activeTab === "registers"}
          className="admin-segment"
        >
          <Store className="h-3.5 w-3.5" />
          <span>Terminales POS & Turno Activo</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          aria-pressed={activeTab === "history"}
          className="admin-segment"
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Historial de Arqueos Auditados</span>
        </button>
      </div>

      {/* =========================================================================
          4. CONTENIDO: TERMINALES POS & TURNOS ACTIVOS
          ========================================================================= */}
      {activeTab === "registers" ? (
        isLoadingRegisters ? (
          <div className="p-16 text-center bg-admin-card-bg rounded-xl border border-admin-card-border">
            <RefreshCw className="h-8 w-8 text-admin-brand-text animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-admin-secondary">
              Cargando terminales y balances en vivo...
            </p>
          </div>
        ) : registers.length === 0 ? (
          <div className="p-12 text-center bg-admin-card-bg rounded-xl border border-dashed border-admin-card-border space-y-3">
            <Store className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-admin-text">
              No hay cajas registradoras configuradas
            </h3>
            <Button
              onClick={() => {
                setNewRegisterCode("POS-01");
                setCreateRegisterModalOpen(true);
              }}
              className="bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid rounded-xl text-xs font-bold"
            >
              Crear Primera Caja Física
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {registers.map((reg) => {
              const active = reg.activeShift;

              if (active) {
                // CASO A: CAJA CON TURNO ABIERTO (Bento Dark Signature Container)
                return (
                  <div
                    key={reg.id}
                    className="admin-register p-6 border border-admin-inverse-border text-white relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Cabecera de la Caja */}
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-admin-brand flex items-center justify-center text-white">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base text-white">{reg.name}</h3>
                            <p className="text-[11px] text-slate-400">
                              Terminal {reg.code} {reg.location && `• ${reg.location}`}
                            </p>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{active.pendingReview ? "Pendiente de aprobación" : "Turno abierto"}</span>
                        </div>
                      </div>

                      {/* Info del Cajero */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center font-semibold">
                            {active.cashierName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-200">{active.cashierName}</p>
                            <p className="text-[10px] text-slate-400">
                              Apertura: {active.openedAt}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-slate-400 text-xs font-bold">
                          {active.shiftNumber}
                        </span>
                      </div>

                      {active.totals && (
                        <dl className="grid grid-cols-3 gap-3 text-xs">
                          <div><dt>Fondo inicial</dt><dd>{formatCurrency(active.totals.initialCash)}</dd></div>
                          <div><dt>Ventas en efectivo</dt><dd>{formatCurrency(active.totals.cashSales)}</dd></div>
                          <div><dt>Tarjeta y QR</dt><dd>{formatCurrency(active.totals.electronicSales)}</dd></div>
                        </dl>
                      )}
                    </div>

                    {/* Botones de Acción del Turno Activo */}
                    <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {active.totals && (
                        <Button variant="outline" type="button" onClick={() => handleViewShiftSales(active.id, active.shiftNumber, reg.name)}>
                          <Receipt className="h-4 w-4" /> Ver tickets
                        </Button>
                      )}
                      {(active.review || (!active.pendingReview && active.userId === user?.id)) && (
                        <Button type="button" onClick={() => {
                          setShiftToClose(active);
                          setActualCashCounted("");
                          setSupervisorNote("");
                          setCloseShiftModalOpen(true);
                        }}>
                          <Banknote className="h-4 w-4" />
                          {active.review ? "Revisar arqueo" : "Registrar conteo"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              }

              // CASO B: CAJA SIN TURNO ACTIVO (Lista para abrir)
              return (
                <div
                  key={reg.id}
                  className="rounded-xl p-6 bg-admin-card-bg border border-admin-card-border flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-admin-card-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-admin-raised flex items-center justify-center text-slate-400">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-admin-text">
                            {reg.name}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Terminal {reg.code} {reg.location && `• ${reg.location}`}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span>Sin Turno Activo</span>
                      </div>
                    </div>

                    <div className="py-8 text-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-admin-raised text-slate-400 mx-auto flex items-center justify-center">
                        <Clock className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-admin-secondary">
                        Terminal lista para nueva jornada
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    disabled={!user || !reg.isActive || (user.role === "cashier" && !!ownShift)}
                    onClick={() => {
                      setSelectedRegisterToOpen(reg);
                      setSelectedCashierId(user?.id ?? 0);
                      setInitialCashInput("150.00");
                      setOpenShiftModalOpen(true);
                    }}
                    className="w-full h-11 rounded-xl font-bold text-xs gap-2 border-admin-brand/30 text-admin-brand-text hover:bg-[var(--admin-brand-light)] cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Abrir Turno en {reg.code}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* =========================================================================
            5. CONTENIDO: HISTORIAL DE ARQUEOS AUDITADOS
            ========================================================================= */
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="admin-panel p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por turno, caja, cajero o supervisor..."
                className="pl-9 h-10 text-xs rounded-xl bg-admin-raised border-admin-card-border"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-admin-secondary font-medium"
              >
                <option value="all">Todos los Resultados</option>
                <option value="balanced">Cierres Cuadrados</option>
                <option value="surplus">Sobrantes (+)</option>
                <option value="shortage">Faltantes (-)</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={loadHistoryData}
                disabled={isLoadingHistory}
                className="h-10 px-3 rounded-xl border-admin-card-border text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingHistory && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Tabla de Arqueos Auditados */}
          <div className="admin-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-admin-card-border bg-admin-raised text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Turno / Caja</th>
                    <th className="py-3 px-4">Cajero</th>
                    <th className="py-3 px-4">Supervisor</th>
                    <th className="py-3 px-4">Apertura / Cierre</th>
                    <th className="py-3 px-4 text-right">Efectivo Esperado</th>
                    <th className="py-3 px-4 text-right">Efectivo Contado</th>
                    <th className="py-3 px-4 text-right">Diferencia</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-admin-brand-text" />
                        Cargando historial de arqueos conciliados...
                      </td>
                    </tr>
                  ) : filteredClosedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        No se encontraron arqueos cerrados coincidentes.
                      </td>
                    </tr>
                  ) : (
                    filteredClosedShifts.map((shift) => (
                      <tr
                        key={shift.id}
                        className="hover:bg-admin-raised transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-admin-text">
                            {shift.shiftNumber}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {shift.registerCode} • {shift.registerName}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-bold">{shift.cashierName}</td>
                        <td className="py-3.5 px-4 text-slate-500">{shift.supervisorName}</td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          <div>{shift.openedAt}</div>
                          <div className="text-slate-400">{shift.closedAt}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {formatCurrency(shift.expectedCash)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {formatCurrency(shift.actualCash)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          <span
                            className={
                              shift.difference === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : shift.difference > 0
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {shift.difference === 0
                              ? formatCurrency(0)
                              : `${shift.difference > 0 ? "+" : ""}${formatCurrency(shift.difference)}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                shift.status === "balanced"
                                  ? "bg-emerald-500"
                                  : shift.status === "surplus"
                                  ? "bg-blue-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <span
                              className={cn(
                                shift.status === "balanced"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : shift.status === "surplus"
                                  ? "text-blue-700 dark:text-blue-400"
                                  : "text-rose-700 dark:text-rose-400"
                              )}
                            >
                              {shift.status === "balanced"
                                ? "Cuadrado"
                                : shift.status === "surplus"
                                ? "Sobrante"
                                : "Faltante"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClosedShift(shift);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 rounded-lg text-xs gap-1 border-admin-card-border text-admin-secondary cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Acta</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL: ARQUEO CIEGO & CIERRE DE TURNO
          ========================================================================= */}
      <Dialog open={closeShiftModalOpen} onOpenChange={setCloseShiftModalOpen}>
        <DialogContent className="sm:max-w-lg admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-lg font-semibold text-admin-text flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-admin-brand-text" />
              {shiftToClose?.review ? "Revisar y aprobar cierre" : "Registrar conteo de efectivo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Turno #{shiftToClose?.shiftNumber} — Operado por {shiftToClose?.cashierName} en {shiftToClose?.cashRegisterCode}.
            </DialogDescription>
          </DialogHeader>

          {shiftToClose?.review ? (
            <div className="space-y-4 py-3 text-sm">
              <dl className="grid grid-cols-3 gap-3 rounded-xl bg-admin-raised p-3">
                <div><dt>Esperado</dt><dd>{formatCurrency(shiftToClose.review.expectedCash)}</dd></div>
                <div><dt>Contado</dt><dd>{formatCurrency(shiftToClose.review.actualCash)}</dd></div>
                <div>
                  <dt>{shiftToClose.review.difference < 0 ? "Faltante" : shiftToClose.review.difference > 0 ? "Sobrante" : "Diferencia"}</dt>
                  <dd>{formatCurrency(Math.abs(shiftToClose.review.difference))}</dd>
                </div>
              </dl>
              <label className="grid gap-2" htmlFor="cash-review-note">
                {shiftToClose.review.difference === 0 ? "Observación opcional" : "Motivo de la diferencia"}
                <Input id="cash-review-note" maxLength={500} value={supervisorNote} onChange={(e) => setSupervisorNote(e.target.value)} />
              </label>
            </div>
          ) : (
            <div className="space-y-3 py-3 text-sm">
              <p>Cuenta el dinero de la gaveta. Al enviar el conteo, el turno queda bloqueado para cobros hasta que un supervisor apruebe el cierre.</p>
              <label className="grid gap-2" htmlFor="physical-cash-count">
                Efectivo contado ({CURRENCY_SYMBOL})
                <Input id="physical-cash-count" type="number" step="0.01" min="0" value={actualCashCounted} onChange={(e) => setActualCashCounted(e.target.value)} />
              </label>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-admin-card-border gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isClosingShift}
              className="rounded-xl h-10 text-xs font-bold border-slate-200"
              onClick={() => setCloseShiftModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={isClosingShift}
              onClick={handleCloseShift}
              className="rounded-xl h-10 text-xs font-bold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-1.5 cursor-pointer"
            >
              {isClosingShift ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Procesando Arqueo...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{shiftToClose?.review ? "Aprobar cierre" : "Enviar conteo"}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          7. MODAL: APERTURA DE TURNO DE CAJA
          ========================================================================= */}
      <Dialog open={openShiftModalOpen} onOpenChange={setOpenShiftModalOpen}>
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-lg font-semibold text-admin-text flex items-center gap-2">
              <Store className="h-5 w-5 text-admin-brand-text" />
              Apertura de Turno en {selectedRegisterToOpen?.code}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedRegisterToOpen?.name} {selectedRegisterToOpen?.location && `• ${selectedRegisterToOpen.location}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Asignar Cajero */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Cajero Responsable del Turno:
              </label>
              {user?.role === "cashier" ? (
                <div className="w-full h-10 px-3 flex items-center justify-between rounded-xl bg-admin-raised border border-admin-card-border font-bold text-slate-800 dark:text-slate-200">
                  <span>{user.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                    Cajero Activo (Tú)
                  </span>
                </div>
              ) : (
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border font-medium"
                >
                  {users.filter(user => user.role !== "warehouse").map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Fondo Inicial */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Fondo de Caja Inicial en Gaveta ({CURRENCY_SYMBOL}):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  {CURRENCY_SYMBOL}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  placeholder="150.00"
                  className="pl-9 h-11 text-base font-semibold rounded-xl border-admin-card-border focus:border-admin-brand"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Monto físico entregado al cajero para cambio y vueltos.
              </p>
            </div>

            {/* Observaciones de Apertura */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Notas / Observaciones de apertura (Opcional):
              </label>
              <Input
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Ej. Billetes de corte chico recibidos en orden..."
                className="h-10 text-xs rounded-xl border-admin-card-border"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-admin-card-border gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isOpeningShift}
              className="rounded-xl h-10 text-xs font-bold border-slate-200"
              onClick={() => setOpenShiftModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={isOpeningShift}
              onClick={handleOpenShift}
              className="rounded-xl h-10 text-xs font-bold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-1.5 cursor-pointer"
            >
              {isOpeningShift ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Abriendo...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Iniciar Turno de Cobro</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          8. MODAL: CREAR NUEVA CAJA FÍSICA
          ========================================================================= */}
      <Dialog open={createRegisterModalOpen} onOpenChange={setCreateRegisterModalOpen}>
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-lg font-semibold text-admin-text flex items-center gap-2">
              <Plus className="h-5 w-5 text-admin-brand-text" />
              Nueva Caja Física Registradora
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra una terminal física adicional para habilitar múltiples puntos de cobro concurrentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Nombre de la Caja:
              </label>
              <Input
                value={newRegisterName}
                onChange={(e) => setNewRegisterName(e.target.value)}
                placeholder="Ej. Caja 3 - Planta Alta / Mostrador Rápido"
                className="h-10 text-xs rounded-xl border-admin-card-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary">
                  Código Identificador:
                </label>
                <Input
                  value={newRegisterCode}
                  onChange={(e) => setNewRegisterCode(e.target.value.toUpperCase())}
                  placeholder="POS-03"
                  className="h-10 text-xs font-mono font-bold rounded-xl border-admin-card-border uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary">
                  Ubicación física:
                </label>
                <Input
                  value={newRegisterLocation}
                  onChange={(e) => setNewRegisterLocation(e.target.value)}
                  placeholder="Ej. Salón Principal"
                  className="h-10 text-xs rounded-xl border-admin-card-border"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-admin-card-border gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isCreatingRegister}
              className="rounded-xl h-10 text-xs font-bold border-slate-200"
              onClick={() => setCreateRegisterModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={isCreatingRegister}
              onClick={handleCreateRegister}
              className="rounded-xl h-10 text-xs font-bold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-1.5 cursor-pointer"
            >
              {isCreatingRegister ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Guardar Caja Registradora</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          9. MODAL: VER ACTA DE ARQUEO HISTÓRICO
          ========================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-base font-semibold text-admin-text flex items-center gap-2">
              <Receipt className="h-4 w-4 text-admin-brand-text" />
              Acta de Arqueo #{selectedClosedShift?.shiftNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Terminal {selectedClosedShift?.registerCode} • {selectedClosedShift?.registerName}
            </DialogDescription>
          </DialogHeader>

          {selectedClosedShift && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                <div>
                  <span className="text-slate-400 font-medium">Cajero:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedClosedShift.cashierName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Supervisor:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedClosedShift.supervisorName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Apertura:</span>
                  <p className="font-semibold text-admin-secondary">{selectedClosedShift.openedAt}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Cierre:</span>
                  <p className="font-semibold text-admin-secondary">{selectedClosedShift.closedAt}</p>
                </div>
              </div>

              {/* Desglose de Dinero */}
              <div className="space-y-2 p-3.5 rounded-xl bg-admin-raised border border-slate-100 dark:border-slate-750">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fondo Inicial:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(selectedClosedShift.initialCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ventas en Efectivo:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(selectedClosedShift.cashSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ventas Tarjeta / QR:</span>
                  <span className="font-mono font-bold text-admin-brand-text">
                    {formatCurrency(selectedClosedShift.cardSales + selectedClosedShift.transferSales)}
                  </span>
                </div>
                <div className="pt-2 border-t border-admin-card-border flex justify-between font-bold">
                  <span>Efectivo Esperado:</span>
                  <span className="font-mono text-sm">{formatCurrency(selectedClosedShift.expectedCash)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Efectivo Contado:</span>
                  <span className="font-mono">{formatCurrency(selectedClosedShift.actualCash)}</span>
                </div>
                <div className="pt-2 border-t border-admin-card-border flex justify-between font-semibold text-sm">
                  <span>Diferencia de Caja:</span>
                  <span
                    className={
                      selectedClosedShift.difference === 0
                        ? "text-emerald-600"
                        : selectedClosedShift.difference > 0
                        ? "text-blue-600"
                        : "text-rose-600"
                    }
                  >
                    {selectedClosedShift.difference === 0
                      ? formatCurrency(0)
                      : `${selectedClosedShift.difference > 0 ? "+" : ""}${formatCurrency(selectedClosedShift.difference)}`}
                  </span>
                </div>
              </div>

              {selectedClosedShift.notes && (
                <div className="p-3 rounded-xl bg-admin-raised text-[11px] text-admin-secondary">
                  <span className="font-bold block text-admin-secondary">Observaciones:</span>
                  {selectedClosedShift.notes}
                </div>
              )}

              {/* Botón para ver los tickets de este turno cerrado */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleViewShiftSales(
                    selectedClosedShift.id,
                    selectedClosedShift.shiftNumber,
                    selectedClosedShift.registerName
                  );
                }}
                className="w-full h-10 rounded-xl border-admin-brand/30 text-admin-brand-text hover:bg-[var(--admin-brand-light)] text-xs font-bold gap-2 cursor-pointer"
              >
                <Receipt className="h-4 w-4" />
                <span>Ver Todos los Tickets y Productos Vendidos</span>
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="w-full text-xs h-9 rounded-xl border-slate-200"
            >
              Cerrar Acta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          10. MODAL: TICKETS Y PRODUCTOS VENDIDOS EN LA CAJA (DRILL-DOWN)
          ========================================================================= */}
      <Dialog open={shiftSalesModalOpen} onOpenChange={setShiftSalesModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold text-admin-text flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-admin-brand-text" />
                  Ventas de la Caja: {shiftSalesData?.registerName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Turno #{shiftSalesData?.shiftNumber} • {shiftSalesData?.ticketsCount || 0} tickets emitidos
                </DialogDescription>
              </div>
              <div className="text-sm font-semibold text-admin-brand-text">
                Total: {formatCurrency(shiftSalesData?.totalRevenue || 0)}
              </div>
            </div>
          </DialogHeader>

          {isLoadingShiftSales ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-admin-brand-text" />
              <p className="text-xs font-medium">Cargando tickets y productos vendidos...</p>
            </div>
          ) : !shiftSalesData || shiftSalesData.sales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Receipt className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm font-bold text-admin-secondary">
                Aún no hay tickets cobrados en este turno
              </p>
              <p className="text-xs text-slate-400">
                Cada venta realizada en el Punto de Venta (POS) aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {/* Desglose rápido por medio de pago */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                    Efectivo:
                  </span>
                  <span className="font-bold text-admin-text">
                    {formatCurrency(shiftSalesData.cashSalesTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-admin-brand-text" />
                    Tarjeta / QR:
                  </span>
                  <span className="font-bold text-admin-text">
                    {formatCurrency(shiftSalesData.electronicSalesTotal)}
                  </span>
                </div>
              </div>

              {/* Lista de tickets emitidos */}
              <div className="space-y-2">
                {shiftSalesData.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-admin-text">
                          #{sale.saleNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">· {sale.createdAt}</span>
                        <span className="text-admin-secondary font-bold">
                          {sale.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-admin-raised text-admin-secondary capitalize">
                          {sale.paymentMethod === "cash"
                            ? "Efectivo"
                            : sale.paymentMethod === "card"
                            ? "Tarjeta"
                            : "QR / Transf."}
                        </span>
                        <span className="font-semibold text-sm text-admin-text">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Desglose de productos vendidos en este ticket */}
                    <div className="pt-2 border-t border-admin-card-border space-y-1">
                      {sale.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-[11px] text-admin-secondary"
                        >
                          <span className="truncate pr-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {it.quantity}x
                            </span>{" "}
                            {it.productName}
                          </span>
                          <span className="font-mono shrink-0 font-medium">
                            {formatCurrency(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-admin-card-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShiftSalesModalOpen(false)}
              className="w-full text-xs h-9 rounded-xl border-slate-200 cursor-pointer"
            >
              Cerrar Listado de Ventas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
