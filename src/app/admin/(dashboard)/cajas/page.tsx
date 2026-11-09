"use client";

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

  // Modal: Arqueo Ciego & Cierre de Caja
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [shiftToClose, setShiftToClose] = useState<ActiveShiftDetail | null>(null);
  const [actualCashCounted, setActualCashCounted] = useState<string>("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number>(1);
  const [supervisorNote, setSupervisorNote] = useState("");
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Modal: Apertura de Turno
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [selectedRegisterToOpen, setSelectedRegisterToOpen] = useState<CashRegisterItem | null>(null);
  const [selectedCashierId, setSelectedCashierId] = useState<number>(3);
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

        // Preseleccionar supervisor y cajero por defecto
        const defaultSupervisor = res.users.find((u) => u.role === "manager" || u.role === "admin");
        if (defaultSupervisor) setSelectedSupervisorId(defaultSupervisor.id);

        if (user?.role === "cashier") {
          setSelectedCashierId(user.id);
        } else {
          const defaultCashier = res.users.find((u) => u.role === "cashier") || res.users[0];
          if (defaultCashier) setSelectedCashierId(defaultCashier.id);
        }
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

  // Cálculos para el modal de Arqueo
  const countedNum = parseFloat(actualCashCounted) || 0;
  const difference = useMemo(() => {
    if (!shiftToClose) return 0;
    return parseFloat((countedNum - shiftToClose.expectedCash).toFixed(2));
  }, [countedNum, shiftToClose]);

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

    if (actualCashCounted.trim() === "") {
      toast.error("Debes ingresar el conteo físico de dinero en gaveta.");
      return;
    }

    setIsClosingShift(true);
    try {
      const res = await closeShiftAction({
        shiftId: shiftToClose.id,
        actualCash: countedNum,
        closedByUserId: selectedSupervisorId,
        notes: supervisorNote.trim() || null,
      });

      if (res.success) {
        toast.success(`Turno #${shiftToClose.shiftNumber} cerrado exitosamente`, {
          description: `Arqueo conciliado (${difference === 0 ? "Cuadrado exacto" : difference > 0 ? "Sobrante" : "Faltante"}).`,
        });
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* =========================================================================
          1. HEADER CON BOTÓN DE NUEVA CAJA Y ARQUEO
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Control de Cajas & Arqueos
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
              Multi-Terminal POS
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de turnos de cobro, conciliación de efectivo en gaveta y auditoría de arqueos ciegos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón para crear nueva caja física */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewRegisterCode(`POS-0${registers.length + 1}`);
              setCreateRegisterModalOpen(true);
            }}
            className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Caja Física</span>
          </Button>

          {/* Botón rápido para refrescar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadRegistersData();
              if (activeTab === "history") loadHistoryData();
            }}
            disabled={isLoadingRegisters}
            className="h-10 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingRegisters && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. KPIS FINANCIEROS DE CONTROL DE CAJAS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Fondo Inicial Activo */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Fondo Inicial en Gavetas</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(kpis.activeInitialCash)}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {kpis.activeShiftsCount} {kpis.activeShiftsCount === 1 ? "caja abierta" : "cajas abiertas"}
            </p>
          </div>
        </div>

        {/* Card 2: Ventas Efectivo Hoy */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Ventas Efectivo Hoy</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(kpis.todayCashSales)}
            </span>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              Dinero ingresado en turnos
            </p>
          </div>
        </div>

        {/* Card 3: Ventas Tarjeta / QR */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Ventas Tarjeta / QR</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(kpis.todayCardTransferSales)}
            </span>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
              Cobros electrónicos conciliados
            </p>
          </div>
        </div>

        {/* Card 4: Precisión de Arqueos */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Precisión de Arqueos</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.auditPrecisionPercent}%
            </span>
            <p className="text-[11px] text-blue-600 font-bold mt-0.5">
              Cierres cuadrados exactos
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. SELECTOR DE PESTAÑAS (TERMINALES vs HISTORIAL)
          ========================================================================= */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 w-fit">
        <button
          onClick={() => setActiveTab("registers")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
            activeTab === "registers"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
        >
          <Store className="h-3.5 w-3.5" />
          <span>Terminales POS & Turno Activo</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
            activeTab === "history"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          )}
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
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Cargando terminales y balances en vivo...
            </p>
          </div>
        ) : registers.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <Store className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No hay cajas registradoras configuradas
            </h3>
            <Button
              onClick={() => {
                setNewRegisterCode("POS-01");
                setCreateRegisterModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
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
                    className="rounded-3xl p-6 bg-[#11162b] border border-[#1e2648] text-white shadow-xl relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Cabecera de la Caja */}
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-base text-white">{reg.name}</h3>
                            <p className="text-[11px] text-slate-400">
                              Terminal {reg.code} {reg.location && `• ${reg.location}`}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold text-xs gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          Turno Abierto
                        </Badge>
                      </div>

                      {/* Info del Cajero */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-black">
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

                      {/* Métricas del turno activo */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Fondo
                          </span>
                          <p className="text-sm font-black text-slate-200 mt-0.5 truncate">
                            {formatCurrency(active.initialCash)}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Efectivo
                          </span>
                          <p className="text-sm font-black text-emerald-400 mt-0.5 truncate">
                            +{formatCurrency(active.cashSales)}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tarjetas/QR
                          </span>
                          <p className="text-sm font-black text-indigo-400 mt-0.5 truncate">
                            {formatCurrency(active.cardSales + active.transferSales)}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/80">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                            Esperado
                          </span>
                          <p className="text-sm font-black text-white mt-0.5 truncate">
                            {formatCurrency(active.expectedCash)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción del Turno Activo */}
                    <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() =>
                          handleViewShiftSales(active.id, active.shiftNumber, reg.name)
                        }
                        className="h-11 rounded-2xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-xs font-bold gap-2 cursor-pointer transition-all"
                      >
                        <Receipt className="h-4 w-4 text-sky-400" />
                        <span>Ver Tickets ({formatCurrency(active.cashSales + active.cardSales + active.transferSales)})</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          setShiftToClose(active);
                          setActualCashCounted(active.expectedCash.toFixed(2));
                          setCloseShiftModalOpen(true);
                        }}
                        className="h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-98 transition-all"
                      >
                        <Banknote className="h-4 w-4" />
                        <span>Cerrar Turno & Arqueo</span>
                      </Button>
                    </div>
                  </div>
                );
              }

              // CASO B: CAJA SIN TURNO ACTIVO (Lista para abrir)
              return (
                <div
                  key={reg.id}
                  className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-900 dark:text-white">
                            {reg.name}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Terminal {reg.code} {reg.location && `• ${reg.location}`}
                          </p>
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
                        Inicia un nuevo turno asignando el cajero responsable y el fondo de caja inicial.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRegisterToOpen(reg);
                      setInitialCashInput("150.00");
                      setOpenShiftModalOpen(true);
                    }}
                    className="w-full h-11 rounded-2xl font-bold text-xs gap-2 border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
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
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por turno, caja, cajero o supervisor..."
                className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
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
                className="h-10 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingHistory && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Tabla de Arqueos Auditados */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
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
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
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
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 dark:text-white">
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
                        <td className="py-3.5 px-4 text-right font-mono font-black">
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
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClosedShift(shift);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 rounded-lg text-xs gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
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
        <DialogContent className="sm:max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Arqueo Ciego & Cierre de Caja
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Turno #{shiftToClose?.shiftNumber} — Operado por {shiftToClose?.cashierName} en {shiftToClose?.cashRegisterCode}.
            </DialogDescription>
          </DialogHeader>

          {shiftToClose && (
            <div className="space-y-4 py-3 text-xs">
              {/* Desglose Financiero del Turno */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 font-medium">Fondo Inicial:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {formatCurrency(shiftToClose.initialCash)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Ventas Efectivo:</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{formatCurrency(shiftToClose.cashSales)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Ventas Tarjeta / QR:</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {formatCurrency(shiftToClose.cardSales + shiftToClose.transferSales)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Efectivo Esperado en Gaveta:</span>
                  <p className="font-black text-slate-900 dark:text-white text-base">
                    {formatCurrency(shiftToClose.expectedCash)}
                  </p>
                </div>
              </div>

              {/* Input de Conteo Físico Real */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dinero Físico en Gaveta (Contado por el cajero):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {CURRENCY_SYMBOL}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-9 h-11 text-base font-black rounded-xl border-slate-200 dark:border-slate-700 focus:border-indigo-600"
                    value={actualCashCounted}
                    onChange={(e) => setActualCashCounted(e.target.value)}
                  />
                </div>
              </div>

              {/* Verificación de Cuadre en Vivo */}
              <div
                className={cn(
                  "p-3 rounded-2xl border flex items-center justify-between font-bold transition-colors",
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
                      ? `Sobrante de dinero: +${formatCurrency(difference)}`
                      : `Faltante de dinero: -${formatCurrency(Math.abs(difference))}`}
                  </span>
                </div>
                <span className="text-sm font-black">
                  {difference === 0 ? formatCurrency(0) : `${difference > 0 ? "+" : ""}${formatCurrency(difference)}`}
                </span>
              </div>

              {/* Selector de Supervisor que autoriza el cierre */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Supervisor que autoriza el arqueo:
                </label>
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Observación / Justificación del Arqueo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Firma / Observación del Supervisor:
                </label>
                <Input
                  placeholder="Ej. Conforme con el recuento sin discrepancias..."
                  className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                  value={supervisorNote}
                  onChange={(e) => setSupervisorNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
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
              className="rounded-xl h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
            >
              {isClosingShift ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Procesando Arqueo...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirmar y Cerrar Turno</span>
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
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="h-5 w-5 text-indigo-600" />
              Apertura de Turno en {selectedRegisterToOpen?.code}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedRegisterToOpen?.name} {selectedRegisterToOpen?.location && `• ${selectedRegisterToOpen.location}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Asignar Cajero */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cajero Responsable del Turno:
              </label>
              {user?.role === "cashier" ? (
                <div className="w-full h-10 px-3 flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                  <span>{user.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                    Cajero Activo (Tú)
                  </span>
                </div>
              ) : (
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Fondo Inicial */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                  className="pl-9 h-11 text-base font-black rounded-xl border-slate-200 dark:border-slate-700 focus:border-indigo-600"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Monto físico entregado al cajero para cambio y vueltos.
              </p>
            </div>

            {/* Observaciones de Apertura */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notas / Observaciones de apertura (Opcional):
              </label>
              <Input
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Ej. Billetes de corte chico recibidos en orden..."
                className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
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
              className="rounded-xl h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
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
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Nueva Caja Física Registradora
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra una terminal física adicional para habilitar múltiples puntos de cobro concurrentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre de la Caja:
              </label>
              <Input
                value={newRegisterName}
                onChange={(e) => setNewRegisterName(e.target.value)}
                placeholder="Ej. Caja 3 - Planta Alta / Mostrador Rápido"
                className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Código Identificador:
                </label>
                <Input
                  value={newRegisterCode}
                  onChange={(e) => setNewRegisterCode(e.target.value.toUpperCase())}
                  placeholder="POS-03"
                  className="h-10 text-xs font-mono font-bold rounded-xl border-slate-200 dark:border-slate-700 uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ubicación física:
                </label>
                <Input
                  value={newRegisterLocation}
                  onChange={(e) => setNewRegisterLocation(e.target.value)}
                  placeholder="Ej. Salón Principal"
                  className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
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
              className="rounded-xl h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
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
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              Acta de Arqueo #{selectedClosedShift?.shiftNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Terminal {selectedClosedShift?.registerCode} • {selectedClosedShift?.registerName}
            </DialogDescription>
          </DialogHeader>

          {selectedClosedShift && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
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
                  <p className="font-semibold text-slate-600 dark:text-slate-400">{selectedClosedShift.openedAt}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Cierre:</span>
                  <p className="font-semibold text-slate-600 dark:text-slate-400">{selectedClosedShift.closedAt}</p>
                </div>
              </div>

              {/* Desglose de Dinero */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-750">
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
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(selectedClosedShift.cardSales + selectedClosedShift.transferSales)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                  <span>Efectivo Esperado:</span>
                  <span className="font-mono text-sm">{formatCurrency(selectedClosedShift.expectedCash)}</span>
                </div>
                <div className="flex justify-between font-black text-sm">
                  <span>Efectivo Contado:</span>
                  <span className="font-mono">{formatCurrency(selectedClosedShift.actualCash)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
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
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold block text-slate-700 dark:text-slate-200">Observaciones:</span>
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
                className="w-full h-10 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold gap-2 cursor-pointer"
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-sky-600" />
                  Ventas de la Caja: {shiftSalesData?.registerName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Turno #{shiftSalesData?.shiftNumber} • {shiftSalesData?.ticketsCount || 0} tickets emitidos
                </DialogDescription>
              </div>
              <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 text-xs font-black">
                Total: {formatCurrency(shiftSalesData?.totalRevenue || 0)}
              </Badge>
            </div>
          </DialogHeader>

          {isLoadingShiftSales ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs font-medium">Cargando tickets y productos vendidos...</p>
            </div>
          ) : !shiftSalesData || shiftSalesData.sales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Receipt className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Aún no hay tickets cobrados en este turno
              </p>
              <p className="text-xs text-slate-400">
                Cada venta realizada en el Punto de Venta (POS) aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {/* Desglose rápido por medio de pago */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                    Efectivo:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(shiftSalesData.cashSalesTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                    Tarjeta / QR:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(shiftSalesData.electronicSalesTotal)}
                  </span>
                </div>
              </div>

              {/* Lista de tickets emitidos */}
              <div className="space-y-2">
                {shiftSalesData.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          #{sale.saleNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">· {sale.createdAt}</span>
                        <span className="text-slate-600 dark:text-slate-300 font-bold">
                          {sale.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                          {sale.paymentMethod === "cash"
                            ? "Efectivo"
                            : sale.paymentMethod === "card"
                            ? "Tarjeta"
                            : "QR / Transf."}
                        </span>
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Desglose de productos vendidos en este ticket */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1">
                      {sale.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400"
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

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
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
