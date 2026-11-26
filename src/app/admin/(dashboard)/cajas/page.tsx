"use client";

import Link from "next/link";
import { MetricCard } from "@/components/admin/metric-card";
import CajasLoading from "./loading";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  ShieldCheck,
  Plus,
  TrendingUp,
  Receipt,
  Store,
  Clock,
  RefreshCw,
  Search,
  Eye,
  Check,
  Settings,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, formatCurrency } from "@/lib/currency";
import { SHOW_CARD_PAYMENT } from "@/lib/payment-methods";
import { useAuth } from "@/context/auth-context";
import {
  getCashRegistersAndShiftsAction,
  getClosedShiftsHistoryAction,
  openShiftAction,
  closeShiftAction,
  requestCashRecountAction,
  submitCashCountAction,
  getShiftSalesAction,
  type CashRegisterItem,
  type ClosedShiftItem,
  type CashKpisSummary,
  type UserOption,
  type ActiveShiftDetail,
  type ShiftSaleDetail,
  type ShiftRefundDetail,
} from "@/app/admin/actions/cash-shifts";

function toCents(value: number): number {
  return Math.round(value * 100);
}

function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  if (Math.abs(num * 100 - Math.round(num * 100)) >= 1e-6) return null;
  return Number(num.toFixed(2));
}

function formatDiffAmount(diff: number): string {
  if (Math.abs(diff) < 0.005) return formatCurrency(0);
  return `${diff > 0 ? "+" : "-"}${formatCurrency(Math.abs(diff))}`;
}

function ReconciliationAmountField({
  id,
  label,
  expectedAmount,
  expectedHint = false,
  value,
  onChange,
  difference,
  diffLabels,
  disabled = false,
}: {
  id: string;
  label: string;
  expectedAmount: number;
  expectedHint?: boolean;
  value: string;
  onChange: (nextValue: string) => void;
  difference: number | null;
  diffLabels: { shortage: string; surplus: string; balanced: string };
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-admin-secondary" htmlFor={id}>
            {label}
            {expectedHint && (
              <span className="ml-1.5 font-normal text-slate-500">
                (Esp. <span className="font-mono">{formatCurrency(expectedAmount)}</span>)
              </span>
            )}
          </label>
          <button
            type="button"
            disabled={expectedAmount < 0 || disabled}
            onClick={() => onChange(expectedAmount.toFixed(2))}
            className="text-[11px] font-semibold text-admin-brand-text hover:underline disabled:opacity-40 cursor-pointer"
          >
            Igualar esperado
          </button>
        </div>
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0"
          disabled={disabled}
          placeholder={expectedAmount.toFixed(2)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {difference !== null && (
        <div className="flex items-center justify-between rounded-xl border border-admin-card-border bg-admin-raised px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-admin-secondary">
            {difference < 0
              ? diffLabels.shortage
              : difference > 0
              ? diffLabels.surplus
              : diffLabels.balanced}
          </span>
          <span
            className={cn(
              "font-mono font-bold",
              difference < 0
                ? "text-rose-600 dark:text-rose-400"
                : difference > 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatDiffAmount(difference)}
          </span>
        </div>
      )}
    </>
  );
}

export default function CajasPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const canReview = Boolean(user && user.role !== "cashier");
  const [activeTab, setActiveTab] = useState<"registers" | "history">("registers");

  // Estado de cajas y turnos activos
  const [registers, setRegisters] = useState<CashRegisterItem[]>([]);
  const [kpis, setKpis] = useState<CashKpisSummary>({
    activeInitialCash: 0,
    todayCashSales: 0,
    todayCardTransferSales: 0,
    auditPrecisionPercent: 100,
    closedShiftsCount: 0,
    balancedShiftsCount: 0,
    activeShiftsCount: 0,
    totalRegistersCount: 0,
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(true);
  const [hasLoadedRegisters, setHasLoadedRegisters] = useState(false);

  // Estado de historial de arqueos cerrados
  const [closedShifts, setClosedShifts] = useState<ClosedShiftItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  // Modal: revisión de arqueo, cierre directo, reconteo o conteo ciego
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [shiftToClose, setShiftToClose] = useState<ActiveShiftDetail | null>(null);
  const [actualCashCounted, setActualCashCounted] = useState<string>("");
  const [actualTransferCounted, setActualTransferCounted] = useState<string>("");
  const [actualCardCounted, setActualCardCounted] = useState<string>("");
  const [isEditingCashierCount, setIsEditingCashierCount] = useState(false);
  const [showRecountForm, setShowRecountForm] = useState(false);
  const [recountReasonInput, setRecountReasonInput] = useState("");
  const [isRequestingRecount, setIsRequestingRecount] = useState(false);
  const [supervisorNote, setSupervisorNote] = useState("");
  const [isClosingShift, setIsClosingShift] = useState(false);

  const activeReview = shiftToClose?.review ?? null;
  const activeTotals = shiftToClose?.totals ?? null;
  const isReviewMode = Boolean(activeReview);
  const isDirectCloseMode = Boolean(
    canReview && shiftToClose && !shiftToClose.pendingReview && activeTotals
  );
  const isSupervisorAudit = isReviewMode || isDirectCloseMode;

  const parsedCounted = parseMoneyInput(actualCashCounted);
  const hasEditedCashierCount = Boolean(
    isReviewMode &&
      activeReview &&
      isEditingCashierCount &&
      parsedCounted !== null &&
      toCents(parsedCounted) !== toCents(activeReview.actualCash)
  );
  const auditExpectedCash = activeReview
    ? activeReview.expectedCash
    : activeTotals
    ? activeTotals.expectedCash
    : 0;
  const effectiveActualCash =
    isReviewMode && activeReview
      ? isEditingCashierCount
        ? parsedCounted
        : activeReview.actualCash
      : parsedCounted;
  const cashDifferenceCents =
    isSupervisorAudit && effectiveActualCash !== null
      ? toCents(effectiveActualCash) - toCents(auditExpectedCash)
      : null;
  const cashDifference = cashDifferenceCents !== null ? cashDifferenceCents / 100 : null;

  const auditExpectedTransfer = activeReview
    ? activeReview.expectedTransfer
    : activeTotals
    ? activeTotals.transferSales
    : 0;
  const parsedTransfer = parseMoneyInput(actualTransferCounted);
  const transferDifferenceCents =
    isSupervisorAudit && parsedTransfer !== null
      ? toCents(parsedTransfer) - toCents(auditExpectedTransfer)
      : null;
  const transferDifference =
    transferDifferenceCents !== null ? transferDifferenceCents / 100 : null;

  const auditExpectedCard = activeReview
    ? activeReview.expectedCard
    : activeTotals
    ? activeTotals.cardSales
    : 0;
  const showCardAudit =
    isSupervisorAudit && (SHOW_CARD_PAYMENT || Math.abs(auditExpectedCard) >= 0.01);
  const parsedCard = parseMoneyInput(actualCardCounted);
  const cardDifferenceCents =
    showCardAudit && parsedCard !== null
      ? toCents(parsedCard) - toCents(auditExpectedCard)
      : null;
  const cardDifference = cardDifferenceCents !== null ? cardDifferenceCents / 100 : null;

  const requiresClosingObservation = Boolean(
    (cashDifferenceCents !== null && cashDifferenceCents !== 0) ||
      (transferDifferenceCents !== null && transferDifferenceCents !== 0) ||
      (cardDifferenceCents !== null && cardDifferenceCents !== 0) ||
      hasEditedCashierCount
  );

  // Modal: Apertura de Turno
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [selectedRegisterToOpen, setSelectedRegisterToOpen] = useState<CashRegisterItem | null>(null);
  const [selectedCashierId, setSelectedCashierId] = useState<number>(0);
  const [initialCashInput, setInitialCashInput] = useState<string>("150.00");
  const [openNotes, setOpenNotes] = useState("");
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  // Modal: Ver Detalle de Arqueo Histórico
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClosedShift, setSelectedClosedShift] = useState<ClosedShiftItem | null>(null);

  // Modal: Detalle de Tickets Vendidos en la Caja
  const [shiftSalesModalOpen, setShiftSalesModalOpen] = useState(false);
  const [shiftSalesData, setShiftSalesData] = useState<{
    shiftNumber: string;
    registerName: string;
    sales: ShiftSaleDetail[];
    refunds: ShiftRefundDetail[];
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
      refunds: [],
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
          refunds: res.refunds,
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
      setHasLoadedRegisters(true);
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
    let cancelled = false;
    (async () => {
      try {
        const res = await getCashRegistersAndShiftsAction();
        if (cancelled) return;
        if (res.success) {
          setRegisters(res.registers);
          setKpis(res.kpis);
          setUsers(res.users);
        } else {
          toast.error(res.error || "No se pudieron cargar las cajas.");
        }
      } catch {
        if (!cancelled) {
          toast.error("Error al conectar con la base de datos de cajas.");
        }
      } finally {
        if (!cancelled) {
          setHasLoadedRegisters(true);
          setIsLoadingRegisters(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Manejar apertura de turno
  const handleOpenShift = async () => {
    if (!selectedRegisterToOpen) return;
    const initialCashNum = Number(initialCashInput);
    if (!Number.isFinite(initialCashNum) || initialCashNum < 0) {
      toast.error("Ingresa un fondo inicial válido mayor o igual a cero.");
      return;
    }
    if (user?.role !== "cashier" && !selectedCashierId) {
      toast.error("Selecciona un cajero disponible para abrir el turno.");
      return;
    }

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

  const openCloseShiftModal = (active: ActiveShiftDetail) => {
    const expectedQr = active.review
      ? active.review.expectedTransfer
      : active.totals?.transferSales ?? 0;
    const expectedCard = active.review
      ? active.review.expectedCard
      : active.totals?.cardSales ?? 0;
    setShiftToClose(active);
    setActualCashCounted("");
    setActualTransferCounted(expectedQr === 0 ? "0.00" : "");
    setActualCardCounted(expectedCard === 0 ? "0.00" : "");
    setIsEditingCashierCount(false);
    setShowRecountForm(false);
    setRecountReasonInput("");
    setSupervisorNote("");
    setCloseShiftModalOpen(true);
  };

  // Manejar solicitud de reconteo al cajero
  const handleRequestRecount = async () => {
    if (!shiftToClose) return;
    const reason = recountReasonInput.trim();
    if (reason.length < 3) {
      toast.error("Indica el motivo del reconteo (mínimo 3 caracteres).");
      return;
    }

    setIsRequestingRecount(true);
    try {
      const res = await requestCashRecountAction({ shiftId: shiftToClose.id, reason });
      if (res.success) {
        toast.success("Reconteo solicitado. El cajero deberá volver a contar el efectivo a ciegas.");
        setCloseShiftModalOpen(false);
        setShiftToClose(null);
        setShowRecountForm(false);
        setRecountReasonInput("");
        loadRegistersData();
      } else {
        toast.error(res.error || "No se pudo solicitar el reconteo.");
        loadRegistersData();
      }
    } catch {
      toast.error("Error al procesar la solicitud de reconteo.");
    } finally {
      setIsRequestingRecount(false);
    }
  };

  // Manejar arqueo y cierre de turno
  const handleCloseShift = async () => {
    if (!shiftToClose) return;

    if (activeReview) {
      if (isEditingCashierCount && parsedCounted === null) {
        toast.error("Ingresa un efectivo final válido (máximo 2 decimales).");
        return;
      }
      if (parsedTransfer === null) {
        toast.error("Ingresa el monto de QR verificado en banco (máximo 2 decimales).");
        return;
      }
      if (showCardAudit && parsedCard === null) {
        toast.error("Ingresa el monto verificado de tarjeta (máximo 2 decimales).");
        return;
      }
      if (requiresClosingObservation && !supervisorNote.trim()) {
        toast.error(
          hasEditedCashierCount
            ? "Ingresa una observación obligatoria explicando la edición del conteo o las diferencias."
            : "Explica la diferencia detectada para aprobar el cierre."
        );
        return;
      }
    } else if (isDirectCloseMode && activeTotals) {
      if (parsedCounted === null) {
        toast.error("Ingresa un efectivo contado válido (máximo 2 decimales).");
        return;
      }
      if (parsedTransfer === null) {
        toast.error("Ingresa el monto de QR verificado en banco (máximo 2 decimales).");
        return;
      }
      if (showCardAudit && parsedCard === null) {
        toast.error("Ingresa el monto verificado de tarjeta (máximo 2 decimales).");
        return;
      }
      if (requiresClosingObservation && !supervisorNote.trim()) {
        toast.error("Ingresa una observación de cierre explicando las diferencias detectadas.");
        return;
      }
    } else if (parsedCounted === null) {
      toast.error("Ingresa un efectivo contado válido (máximo 2 decimales).");
      return;
    }

    setIsClosingShift(true);
    try {
      const res = activeReview
        ? await closeShiftAction({
            shiftId: shiftToClose.id,
            mode: "approve",
            actualCash: isEditingCashierCount && parsedCounted !== null ? parsedCounted : undefined,
            actualTransfer: parsedTransfer ?? undefined,
            actualCard: showCardAudit && parsedCard !== null ? parsedCard : undefined,
            notes: supervisorNote.trim(),
          })
        : isDirectCloseMode && activeTotals
        ? await closeShiftAction({
            shiftId: shiftToClose.id,
            mode: "direct",
            actualCash: parsedCounted!,
            expectedCash: activeTotals.expectedCash,
            actualTransfer: parsedTransfer!,
            expectedTransfer: activeTotals.transferSales,
            actualCard: showCardAudit && parsedCard !== null ? parsedCard : undefined,
            expectedCard: showCardAudit ? activeTotals.cardSales : undefined,
            notes: supervisorNote.trim(),
          })
        : await submitCashCountAction({
            shiftId: shiftToClose.id,
            actualCash: parsedCounted!,
          });

      if (res.success) {
        toast.success(
          activeReview
            ? "Cierre auditado y aprobado"
            : isDirectCloseMode
            ? "Caja arqueada y cerrada con éxito"
            : "Conteo enviado para revisión"
        );
        setCloseShiftModalOpen(false);
        setShiftToClose(null);
        setActualCashCounted("");
        setActualTransferCounted("");
        setActualCardCounted("");
        setIsEditingCashierCount(false);
        setShowRecountForm(false);
        setRecountReasonInput("");
        setSupervisorNote("");
        loadRegistersData();
        if (activeTab === "history") loadHistoryData();
      } else {
        toast.error(res.error || "No se pudo cerrar el turno.");
        if (isSupervisorAudit) loadRegistersData();
      }
    } catch {
      toast.error("Error al procesar el cierre de caja.");
    } finally {
      setIsClosingShift(false);
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

  const busyUserIds = useMemo(
    () => new Set(registers.filter((r) => r.activeShift).map((r) => r.activeShift!.userId)),
    [registers]
  );

  const ownShift = user ? registers.find((register) => register.activeShift?.userId === user.id)?.activeShift : null;
  const hasOwnOpenShift = Boolean(ownShift && !ownShift.pendingReview && !ownShift.recountRequired);

  if (!hasLoadedRegisters || isAuthLoading) {
    return <CajasLoading />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* =========================================================================
          1. HEADER CON ACCESO A PUNTO DE VENTA Y ACTUALIZACIÓN
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
      {canReview && (
        <section className="admin-metrics" aria-label="Indicadores de cajas">
          <MetricCard
            label="Fondo inicial en gavetas"
            value={formatCurrency(kpis.activeInitialCash)}
            detail={`${kpis.activeShiftsCount} ${kpis.activeShiftsCount === 1 ? "turno abierto" : "turnos abiertos"} · ${kpis.totalRegistersCount} ${kpis.totalRegistersCount === 1 ? "caja activa" : "cajas activas"}`}
            icon={Banknote}
          />
          <MetricCard
            label="Ventas en efectivo hoy"
            value={formatCurrency(kpis.todayCashSales)}
            detail="Neto en turnos de hoy"
            icon={TrendingUp}
            tone={kpis.todayCashSales < 0 ? "warning" : "success"}
          />
          <MetricCard
            label={SHOW_CARD_PAYMENT ? "Cobros electrónicos hoy" : "Ventas por QR hoy"}
            value={formatCurrency(kpis.todayCardTransferSales)}
            detail={SHOW_CARD_PAYMENT ? "Tarjeta, QR y otros en turnos" : "Neto por QR en turnos de hoy"}
            icon={CreditCard}
          />
          <MetricCard
            label="Precisión de arqueos"
            value={kpis.closedShiftsCount > 0 ? `${kpis.auditPrecisionPercent}%` : "—"}
            detail={
              kpis.closedShiftsCount > 0
                ? `${kpis.balancedShiftsCount} de ${kpis.closedShiftsCount} sin diferencias`
                : "Sin arqueos cerrados aún"
            }
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
          onClick={() => {
            setActiveTab("history");
            loadHistoryData();
          }}
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
        registers.length === 0 ? (
          <div className="p-12 text-center bg-admin-card-bg rounded-xl border border-dashed border-admin-card-border space-y-3">
            <Store className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-admin-text">
              No hay cajas registradoras activas
            </h3>
            {user && user.role !== "cashier" ? (
              <Link
                href="/admin/ajustes"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-admin-brand px-4 text-xs font-bold text-admin-on-solid hover:bg-admin-brand-hover"
              >
                <Settings className="h-4 w-4" />
                <span>Configurar cajas en Ajustes</span>
              </Link>
            ) : (
              <p className="text-xs text-slate-400">
                Solicita a un administrador habilitar una caja física en Ajustes.
              </p>
            )}
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
                              Terminal {reg.code} {reg.location && `• ${reg.location}`}{" "}
                              {!reg.isActive && "• Archivada"}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold",
                            active.pendingReview || active.recountRequired ? "text-amber-400" : "text-emerald-400"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              active.pendingReview || active.recountRequired ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                            )}
                          />
                          <span>
                            {active.pendingReview
                              ? "Pendiente de aprobación"
                              : active.recountRequired
                              ? "Reconteo solicitado"
                              : "Turno abierto"}
                          </span>
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

                      {active.totals && (() => {
                        const showElectronicGroup =
                          SHOW_CARD_PAYMENT || active.totals.cardSales !== 0 || active.totals.otherSales !== 0;
                        return (
                          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <dt className="text-slate-400">Fondo inicial</dt>
                              <dd className="font-mono font-semibold text-white">{formatCurrency(active.totals.initialCash)}</dd>
                            </div>
                            <div>
                              <dt className="text-slate-400">Ventas en efectivo</dt>
                              <dd className="font-mono font-semibold text-white">{formatCurrency(active.totals.cashSales)}</dd>
                            </div>
                            <div>
                              <dt className="text-slate-400">{showElectronicGroup ? "Tarjeta y QR" : "Ventas por QR"}</dt>
                              <dd className="font-mono font-semibold text-white">
                                {formatCurrency(showElectronicGroup ? active.totals.electronicSales : active.totals.transferSales)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-emerald-300 font-medium">Esperado en gaveta</dt>
                              <dd className="font-mono font-bold text-emerald-300">{formatCurrency(active.totals.expectedCash)}</dd>
                            </div>
                          </dl>
                        );
                      })()}

                      {active.pendingReview && !active.review && (
                        <p className="rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2 text-xs text-amber-200">
                          Conteo enviado. Esperando aprobación de un supervisor.
                        </p>
                      )}

                      {active.recountRequired && !active.pendingReview && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2 text-xs text-amber-200 space-y-0.5">
                          <p className="font-semibold">Reconteo solicitado — POS bloqueado hasta confirmar el nuevo conteo</p>
                          {active.recountReason && <p>Motivo: {active.recountReason}</p>}
                        </div>
                      )}
                    </div>

                    {/* Botones de Acción del Turno Activo */}
                    <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {active.totals && (
                        <Button variant="outline" type="button" onClick={() => handleViewShiftSales(active.id, active.shiftNumber, reg.name)}>
                          <Receipt className="h-4 w-4" /> Ver tickets
                        </Button>
                      )}
                      {(active.review || (canReview && !active.pendingReview) || (!active.pendingReview && active.userId === user?.id)) && (
                        <Button type="button" onClick={() => openCloseShiftModal(active)}>
                          <Banknote className="h-4 w-4" />
                          {active.review
                            ? "Revisar arqueo"
                            : canReview && !active.pendingReview
                            ? "Arquear y cerrar"
                            : active.recountRequired
                            ? "Registrar nuevo conteo"
                            : "Registrar conteo"}
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
                      const defaultCashier =
                        user && !busyUserIds.has(user.id)
                          ? user.id
                          : users.find((u) => !busyUserIds.has(u.id))?.id ?? user?.id ?? 0;
                      setSelectedRegisterToOpen(reg);
                      setSelectedCashierId(defaultCashier);
                      setInitialCashInput("150.00");
                      setOpenNotes("");
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
                <option value="mixed">Descuadres cruzados</option>
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
                    <th className="py-3 px-4 text-right">Efectivo (Esp. / Cont.)</th>
                    <th className="py-3 px-4 text-right">Dif. Efectivo</th>
                    <th className="py-3 px-4 text-right">Dif. QR</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                  {isLoadingHistory && closedShifts.length === 0 ? (
                    [1, 2, 3, 4, 5].map((row) => (
                      <tr key={row}>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-28 rounded-md bg-admin-card-border" />
                            <Skeleton className="h-3 w-36 rounded-md bg-admin-card-border" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-4 w-24 rounded-md bg-admin-card-border" />
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-4 w-24 rounded-md bg-admin-card-border" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-24 rounded-md bg-admin-card-border" />
                            <Skeleton className="h-3 w-24 rounded-md bg-admin-card-border" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-4 w-16 rounded-md ml-auto bg-admin-card-border" />
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-4 w-16 rounded-md ml-auto bg-admin-card-border" />
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-4 w-14 rounded-md ml-auto bg-admin-card-border" />
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-5 w-20 rounded-full mx-auto bg-admin-card-border" />
                        </td>
                        <td className="py-3.5 px-4">
                          <Skeleton className="h-8 w-16 rounded-lg ml-auto bg-admin-card-border" />
                        </td>
                      </tr>
                    ))
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
                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="font-bold text-admin-text">{formatCurrency(shift.actualCash)}</div>
                          <div className="text-[10px] text-slate-400">Esp. {formatCurrency(shift.expectedCash)}</div>
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
                            {formatDiffAmount(shift.difference)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          {shift.transferDifference === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span
                              className={
                                shift.transferDifference === 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : shift.transferDifference > 0
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {formatDiffAmount(shift.transferDifference)}
                            </span>
                          )}
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
                                  : shift.status === "mixed"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <span
                              className={cn(
                                shift.status === "balanced"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : shift.status === "surplus"
                                  ? "text-blue-700 dark:text-blue-400"
                                  : shift.status === "mixed"
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-rose-700 dark:text-rose-400"
                              )}
                            >
                              {shift.status === "balanced"
                                ? "Cuadrado"
                                : shift.status === "surplus"
                                ? "Sobrante"
                                : shift.status === "mixed"
                                ? "Descuadre"
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
          6. MODAL: ARQUEO CIEGO, REVISIÓN SUPERVISADA Y CIERRE DE TURNO
          ========================================================================= */}
      <Dialog
        open={closeShiftModalOpen}
        onOpenChange={(open) => {
          if (!open && (isClosingShift || isRequestingRecount)) return;
          setCloseShiftModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-lg font-semibold text-admin-text flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-admin-brand-text" />
              {isReviewMode
                ? "Revisar y aprobar cierre"
                : isDirectCloseMode
                ? "Arqueo y cierre de caja"
                : shiftToClose?.recountRequired
                ? "Registrar reconteo de efectivo"
                : "Registrar conteo de efectivo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Turno #{shiftToClose?.shiftNumber} — Operado por {shiftToClose?.cashierName} en {shiftToClose?.cashRegisterCode}.
            </DialogDescription>
          </DialogHeader>

          {activeReview ? (
            <div className="space-y-4 py-3 text-sm">
              {/* Bloque de Efectivo con opción auditada de edición */}
              <div className="space-y-2.5 rounded-xl bg-admin-raised p-3.5 border border-admin-card-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-admin-text">Efectivo físico en gaveta</span>
                  <button
                    type="button"
                    disabled={showRecountForm || isClosingShift || isRequestingRecount}
                    onClick={() => {
                      if (!isEditingCashierCount) {
                        setActualCashCounted(activeReview.actualCash.toFixed(2));
                        setIsEditingCashierCount(true);
                      } else {
                        setActualCashCounted("");
                        setIsEditingCashierCount(false);
                      }
                    }}
                    className="text-[11px] font-semibold text-admin-brand-text hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    {isEditingCashierCount ? "Mantener conteo del cajero" : "Editar conteo"}
                  </button>
                </div>

                <dl className="grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-xs text-slate-500">Esperado</dt>
                    <dd className="font-mono font-semibold">{formatCurrency(activeReview.expectedCash)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      {isEditingCashierCount ? "Contado final" : "Contado cajero"}
                    </dt>
                    <dd className="font-mono font-semibold">
                      {effectiveActualCash !== null ? formatCurrency(effectiveActualCash) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      {cashDifference === null
                        ? "Diferencia"
                        : cashDifference < 0
                        ? "Faltante"
                        : cashDifference > 0
                        ? "Sobrante"
                        : "Cuadrado"}
                    </dt>
                    <dd
                      className={cn(
                        "font-mono font-semibold",
                        cashDifference === null
                          ? "text-slate-400"
                          : cashDifference < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : cashDifference > 0
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {cashDifference === null ? "—" : formatDiffAmount(cashDifference)}
                    </dd>
                  </div>
                </dl>

                {isEditingCashierCount && (
                  <div className="space-y-1.5 pt-2 border-t border-admin-card-border">
                    <label className="text-xs font-bold text-admin-secondary" htmlFor="physical-cash-count">
                      Efectivo contado final ({CURRENCY_SYMBOL})
                    </label>
                    <Input
                      id="physical-cash-count"
                      type="number"
                      step="0.01"
                      min="0"
                      value={actualCashCounted}
                      onChange={(e) => setActualCashCounted(e.target.value)}
                    />
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      El cajero declaró {formatCurrency(activeReview.actualCash)}. Toda corrección registra auditoría y exige observación obligatoria.
                    </p>
                  </div>
                )}
              </div>

              {/* Conciliación QR en banco */}
              <ReconciliationAmountField
                id="actual-qr-count"
                label={`QR en banco (${CURRENCY_SYMBOL})`}
                expectedAmount={activeReview.expectedTransfer}
                expectedHint
                value={actualTransferCounted}
                onChange={setActualTransferCounted}
                difference={transferDifference}
                diffLabels={{
                  shortage: "Faltante en QR",
                  surplus: "Sobrante en QR",
                  balanced: "QR cuadrado",
                }}
                disabled={showRecountForm}
              />

              {/* Conciliación Tarjeta (oculta mientras SHOW_CARD_PAYMENT = false y sin ventas con tarjeta) */}
              {showCardAudit && (
                <ReconciliationAmountField
                  id="actual-card-count"
                  label={`Tarjeta POS (${CURRENCY_SYMBOL})`}
                  expectedAmount={activeReview.expectedCard}
                  expectedHint
                  value={actualCardCounted}
                  onChange={setActualCardCounted}
                  difference={cardDifference}
                  diffLabels={{
                    shortage: "Faltante en tarjeta",
                    surplus: "Sobrante en tarjeta",
                    balanced: "Tarjeta cuadrada",
                  }}
                  disabled={showRecountForm}
                />
              )}

              {!showRecountForm ? (
                <div className="space-y-3">
                  <label className="grid gap-2 text-xs font-bold text-admin-secondary" htmlFor="cash-review-note">
                    {requiresClosingObservation
                      ? "Observación de cierre (obligatorio)"
                      : "Observación de cierre (opcional)"}
                    <Input
                      id="cash-review-note"
                      maxLength={500}
                      value={supervisorNote}
                      onChange={(e) => setSupervisorNote(e.target.value)}
                    />
                  </label>

                  <div className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 px-3.5 py-2.5 text-xs">
                    <span className="text-amber-800 dark:text-amber-200">
                      ¿Prefieres que el cajero vuelva a contar?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecountForm(true);
                        setIsEditingCashierCount(false);
                        setActualCashCounted("");
                      }}
                      className="font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer shrink-0 ml-2"
                    >
                      Solicitar reconteo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 text-xs">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Devolver turno a reconteo a ciegas
                  </p>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Se guardará el conteo previo en el historial del turno y el punto de venta seguirá bloqueado hasta que el cajero registre su nuevo conteo.
                  </p>
                  <label className="grid gap-1.5 font-bold text-admin-secondary" htmlFor="recount-reason-input">
                    Motivo del reconteo (obligatorio)
                    <Input
                      id="recount-reason-input"
                      maxLength={300}
                      placeholder="Ej. Diferencia de Bs 20 en billetes de 10..."
                      value={recountReasonInput}
                      onChange={(e) => setRecountReasonInput(e.target.value)}
                    />
                  </label>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRequestingRecount}
                      onClick={() => setShowRecountForm(false)}
                      className="h-9 rounded-xl text-xs"
                    >
                      Volver
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isRequestingRecount}
                      onClick={handleRequestRecount}
                      className="h-9 rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      {isRequestingRecount ? "Enviando..." : "Confirmar reconteo"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : isDirectCloseMode && activeTotals ? (
            <div className="space-y-4 py-3 text-sm">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-admin-raised p-3 border border-admin-card-border">
                <div>
                  <dt className="text-[11px] text-slate-500">Fondo inicial</dt>
                  <dd className="font-mono text-xs font-semibold text-admin-text">
                    {formatCurrency(activeTotals.initialCash)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Ventas efectivo</dt>
                  <dd className="font-mono text-xs font-semibold text-admin-text">
                    {formatCurrency(activeTotals.cashSales)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">
                    {SHOW_CARD_PAYMENT || activeTotals.cardSales !== 0 || activeTotals.otherSales !== 0
                      ? "Tarjeta / QR"
                      : "Ventas QR"}
                  </dt>
                  <dd className="font-mono text-xs font-semibold text-admin-text">
                    {formatCurrency(
                      SHOW_CARD_PAYMENT || activeTotals.cardSales !== 0 || activeTotals.otherSales !== 0
                        ? activeTotals.electronicSales
                        : activeTotals.transferSales
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold text-admin-brand-text">Esperado</dt>
                  <dd className="font-mono text-xs font-bold text-admin-brand-text">
                    {formatCurrency(activeTotals.expectedCash)}
                  </dd>
                </div>
              </dl>

              <ReconciliationAmountField
                id="physical-cash-count"
                label={`Efectivo contado (${CURRENCY_SYMBOL})`}
                expectedAmount={activeTotals.expectedCash}
                value={actualCashCounted}
                onChange={setActualCashCounted}
                difference={cashDifference}
                diffLabels={{
                  shortage: "Faltante en efectivo",
                  surplus: "Sobrante en efectivo",
                  balanced: "Efectivo cuadrado",
                }}
              />

              {/* QR en banco */}
              <ReconciliationAmountField
                id="actual-qr-count"
                label={`QR en banco (${CURRENCY_SYMBOL})`}
                expectedAmount={activeTotals.transferSales}
                value={actualTransferCounted}
                onChange={setActualTransferCounted}
                difference={transferDifference}
                diffLabels={{
                  shortage: "Faltante en QR",
                  surplus: "Sobrante en QR",
                  balanced: "QR cuadrado",
                }}
              />

              {showCardAudit && (
                <ReconciliationAmountField
                  id="actual-card-count"
                  label={`Tarjeta POS (${CURRENCY_SYMBOL})`}
                  expectedAmount={activeTotals.cardSales}
                  value={actualCardCounted}
                  onChange={setActualCardCounted}
                  difference={cardDifference}
                  diffLabels={{
                    shortage: "Faltante en tarjeta",
                    surplus: "Sobrante en tarjeta",
                    balanced: "Tarjeta cuadrada",
                  }}
                />
              )}

              <label className="grid gap-2 text-xs font-bold text-admin-secondary" htmlFor="cash-direct-note">
                {requiresClosingObservation
                  ? "Observación de cierre (obligatorio)"
                  : "Observación de cierre (opcional)"}
                <Input
                  id="cash-direct-note"
                  maxLength={500}
                  value={supervisorNote}
                  onChange={(e) => setSupervisorNote(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3 py-3 text-sm">
              {shiftToClose?.recountRequired && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    Reconteo solicitado por supervisión
                  </p>
                  {shiftToClose.recountReason && (
                    <p className="text-amber-700 dark:text-amber-200">
                      Motivo: {shiftToClose.recountReason}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-admin-secondary">
                Cuenta el dinero físico de la gaveta. Al enviar el conteo, el turno queda bloqueado para cobros hasta que un supervisor apruebe el cierre.
              </p>
              <label className="grid gap-2 text-xs font-bold text-admin-secondary" htmlFor="physical-cash-count">
                Efectivo contado ({CURRENCY_SYMBOL})
                <Input id="physical-cash-count" type="number" step="0.01" min="0" value={actualCashCounted} onChange={(e) => setActualCashCounted(e.target.value)} />
              </label>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-admin-card-border gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isClosingShift || isRequestingRecount}
              className="rounded-xl h-10 text-xs font-bold border-slate-200"
              onClick={() => setCloseShiftModalOpen(false)}
            >
              Cancelar
            </Button>
            {!showRecountForm && (
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
                    <span>
                      {isReviewMode
                        ? "Aprobar y cerrar"
                        : isDirectCloseMode
                        ? "Confirmar y cerrar caja"
                        : shiftToClose?.recountRequired
                        ? "Enviar nuevo conteo"
                        : "Enviar conteo"}
                    </span>
                  </>
                )}
              </Button>
            )}
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
                <div className="space-y-1.5">
                  <select
                    value={selectedCashierId}
                    onChange={(e) => setSelectedCashierId(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border font-medium"
                  >
                    {users
                      .filter((u) => u.role !== "warehouse")
                      .map((u) => {
                        const isBusy = busyUserIds.has(u.id);
                        const roleLabel =
                          u.role === "admin"
                            ? "Administrador"
                            : u.role === "manager"
                            ? "Supervisor"
                            : "Cajero";
                        return (
                          <option key={u.id} value={u.id} disabled={isBusy}>
                            {u.name} ({roleLabel}){isBusy ? " — Turno abierto" : ""}
                          </option>
                        );
                      })}
                  </select>
                  {users.filter((u) => u.role !== "warehouse").every((u) => busyUserIds.has(u.id)) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Todos los operadores habilitados ya tienen un turno abierto.
                    </p>
                  )}
                </div>
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
          8. MODAL: VER ACTA DE ARQUEO HISTÓRICO
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
                    {selectedClosedShift.cashSales >= 0 ? "+" : ""}
                    {formatCurrency(selectedClosedShift.cashSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ventas por QR:</span>
                  <span className="font-mono font-bold text-admin-brand-text">
                    {formatCurrency(selectedClosedShift.transferSales)}
                  </span>
                </div>
                {(SHOW_CARD_PAYMENT || selectedClosedShift.cardSales !== 0 || (selectedClosedShift.cardDifference ?? 0) !== 0) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ventas con Tarjeta:</span>
                    <span className="font-mono font-bold text-admin-brand-text">
                      {formatCurrency(selectedClosedShift.cardSales)}
                    </span>
                  </div>
                )}
                {selectedClosedShift.otherSales > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Otros Medios:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(selectedClosedShift.otherSales)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-admin-card-border flex justify-between font-bold">
                  <span>Efectivo Esperado:</span>
                  <span className="font-mono text-sm">{formatCurrency(selectedClosedShift.expectedCash)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Efectivo Contado:</span>
                  <span className="font-mono">{formatCurrency(selectedClosedShift.actualCash)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Diferencia Efectivo:</span>
                  <span
                    className={
                      selectedClosedShift.difference === 0
                        ? "text-emerald-600"
                        : selectedClosedShift.difference > 0
                        ? "text-blue-600"
                        : "text-rose-600"
                    }
                  >
                    {formatDiffAmount(selectedClosedShift.difference)}
                  </span>
                </div>

                {selectedClosedShift.actualTransfer !== null && selectedClosedShift.transferDifference !== null && (
                  <div className="pt-2 border-t border-admin-card-border space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">QR Esperado:</span>
                      <span className="font-mono font-semibold">{formatCurrency(selectedClosedShift.transferSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">QR Verificado:</span>
                      <span className="font-mono font-semibold">{formatCurrency(selectedClosedShift.actualTransfer)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Diferencia QR:</span>
                      <span
                        className={cn(
                          "font-mono",
                          selectedClosedShift.transferDifference === 0
                            ? "text-emerald-600"
                            : selectedClosedShift.transferDifference > 0
                            ? "text-blue-600"
                            : "text-rose-600"
                        )}
                      >
                        {formatDiffAmount(selectedClosedShift.transferDifference)}
                      </span>
                    </div>
                  </div>
                )}

                {(SHOW_CARD_PAYMENT || selectedClosedShift.cardSales !== 0 || (selectedClosedShift.cardDifference ?? 0) !== 0) &&
                  selectedClosedShift.actualCard !== null &&
                  selectedClosedShift.cardDifference !== null && (
                  <div className="pt-2 border-t border-admin-card-border space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tarjeta Esperada:</span>
                      <span className="font-mono font-semibold">{formatCurrency(selectedClosedShift.cardSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tarjeta Verificada:</span>
                      <span className="font-mono font-semibold">{formatCurrency(selectedClosedShift.actualCard)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Diferencia Tarjeta:</span>
                      <span
                        className={cn(
                          "font-mono",
                          selectedClosedShift.cardDifference === 0
                            ? "text-emerald-600"
                            : selectedClosedShift.cardDifference > 0
                            ? "text-blue-600"
                            : "text-rose-600"
                        )}
                      >
                        {formatDiffAmount(selectedClosedShift.cardDifference)}
                      </span>
                    </div>
                  </div>
                )}
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
            <div className="space-y-4 py-2" aria-label="Cargando tickets del turno">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24 rounded-md bg-admin-card-border" />
                  <Skeleton className="h-4 w-16 rounded-md bg-admin-card-border" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28 rounded-md bg-admin-card-border" />
                  <Skeleton className="h-4 w-16 rounded-md bg-admin-card-border" />
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2].map((ticket) => (
                  <div
                    key={ticket}
                    className="p-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-44 rounded-md bg-admin-card-border" />
                      <Skeleton className="h-5 w-20 rounded-md bg-admin-card-border" />
                    </div>
                    <div className="pt-2 border-t border-admin-card-border space-y-1.5">
                      <Skeleton className="h-3.5 w-full rounded-md bg-admin-card-border" />
                      <Skeleton className="h-3.5 w-4/5 rounded-md bg-admin-card-border" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !shiftSalesData || (shiftSalesData.sales.length === 0 && shiftSalesData.refunds.length === 0) ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Receipt className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm font-bold text-admin-secondary">
                Aún no hay tickets cobrados ni devoluciones en este turno
              </p>
              <p className="text-xs text-slate-400">
                Cada venta o devolución realizada en esta caja aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Desglose neto por medio de pago */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                    Efectivo neto:
                  </span>
                  <span className="font-bold text-admin-text">
                    {formatCurrency(shiftSalesData.cashSalesTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-admin-brand-text" />
                    {SHOW_CARD_PAYMENT ? "Tarjeta / QR / Otros:" : "QR neto:"}
                  </span>
                  <span className="font-bold text-admin-text">
                    {formatCurrency(shiftSalesData.electronicSalesTotal)}
                  </span>
                </div>
              </div>

              {/* Lista de tickets emitidos */}
              {shiftSalesData.sales.length > 0 && (
                <div className="space-y-2">
                  {shiftSalesData.sales.map((sale) => {
                    const isCancelled = sale.status === "cancelled";
                    const hasRefund = sale.refundedAmount > 0;
                    return (
                      <div
                        key={sale.id}
                        className="p-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold text-admin-text">
                              #{sale.saleNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">· {sale.createdAt}</span>
                            <span className="text-admin-secondary font-bold">
                              {sale.customerName}
                            </span>
                            {isCancelled && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                Anulada
                              </span>
                            )}
                            {!isCancelled && hasRefund && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {sale.status === "refunded" ? "Devuelta" : "Dev. parcial"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-admin-raised text-admin-secondary capitalize">
                              {sale.paymentMethod === "cash"
                                ? "Efectivo"
                                : sale.paymentMethod === "card"
                                ? "Tarjeta"
                                : sale.paymentMethod === "other"
                                ? "Otro"
                                : "QR"}
                            </span>
                            <div className="text-right">
                              <span
                                className={cn(
                                  "font-semibold text-sm block",
                                  isCancelled ? "line-through text-slate-400" : "text-admin-text"
                                )}
                              >
                                {formatCurrency(isCancelled ? sale.totalAmount : sale.netAmount)}
                              </span>
                              {!isCancelled && hasRefund && (
                                <span className="text-[10px] text-slate-400 block">
                                  Original {formatCurrency(sale.totalAmount)} · Dev. -{formatCurrency(sale.refundedAmount)}
                                </span>
                              )}
                            </div>
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
                                {it.returnedQuantity > 0 && (
                                  <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                    ({it.returnedQuantity} dev.)
                                  </span>
                                )}
                              </span>
                              <span className="font-mono shrink-0 font-medium">
                                {formatCurrency(it.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Devoluciones aplicadas en este turno */}
              {shiftSalesData.refunds.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-admin-card-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-admin-text">
                    <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                    <span>Devoluciones registradas en este turno ({shiftSalesData.refunds.length})</span>
                  </div>
                  <div className="space-y-2">
                    {shiftSalesData.refunds.map((refund) => (
                      <div
                        key={refund.id}
                        className="p-3 rounded-xl border border-admin-card-border bg-admin-raised/60 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold text-admin-text">
                              #{refund.saleNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">· {refund.createdAt}</span>
                            {refund.isCrossShift && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Venta de otro turno
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-admin-secondary">
                            {refund.customerName} · {refund.reason}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Autorizado por {refund.authorizedByName}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <span className="block font-mono font-semibold text-rose-600 dark:text-rose-400">
                            -{formatCurrency(refund.amount)}
                          </span>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-admin-card-bg border border-admin-card-border text-admin-secondary">
                            {refund.refundMethod === "cash"
                              ? "Efectivo"
                              : refund.refundMethod === "card"
                              ? "Tarjeta"
                              : refund.refundMethod === "other"
                              ? "Otro"
                              : "QR"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
