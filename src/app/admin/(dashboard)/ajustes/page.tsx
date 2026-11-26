"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Check,
  Edit2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Store,
  Trash2,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getCashRegistersManagementAction,
  createCashRegisterAction,
  updateCashRegisterAction,
  toggleCashRegisterArchiveAction,
  deleteCashRegisterAction,
  type CashRegisterManagementItem,
} from "@/app/admin/actions/cash-shifts";

type RegisterFilter = "active" | "archived" | "all";

export default function AjustesPage() {
  const [registers, setRegisters] = useState<CashRegisterManagementItem[]>([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    activeCount: 0,
    archivedCount: 0,
    openShiftsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<RegisterFilter>("active");

  // Modal Crear / Editar Caja Física
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegisterManagementItem | null>(null);
  const [registerName, setRegisterName] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [registerLocation, setRegisterLocation] = useState("");
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Modal Confirmar Archivo
  const [archiveTarget, setArchiveTarget] = useState<CashRegisterManagementItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Modal Confirmar Eliminación
  const [deleteTarget, setDeleteTarget] = useState<CashRegisterManagementItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getCashRegistersManagementAction();
      if (res.success) {
        setRegisters(res.registers);
        setSummary(res.summary);
      } else {
        toast.error(res.error || "No se pudo cargar la configuración de cajas.");
      }
    } catch {
      toast.error("Error de conexión al cargar Ajustes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getCashRegistersManagementAction()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setRegisters(res.registers);
          setSummary(res.summary);
        } else {
          toast.error(res.error || "No se pudo cargar la configuración de cajas.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Error de conexión al cargar Ajustes.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRegisters = useMemo(() => {
    if (filter === "active") return registers.filter((r) => r.isActive);
    if (filter === "archived") return registers.filter((r) => !r.isActive);
    return registers;
  }, [registers, filter]);

  const suggestNextCode = () => {
    const used = new Set(registers.map((r) => r.code.toUpperCase()));
    let n = registers.length + 1;
    while (used.has(`POS-${String(n).padStart(2, "0")}`)) {
      n += 1;
    }
    return `POS-${String(n).padStart(2, "0")}`;
  };

  const openCreateModal = () => {
    setEditingRegister(null);
    setRegisterName("");
    setRegisterCode(suggestNextCode());
    setRegisterLocation("");
    setFormModalOpen(true);
  };

  const openEditModal = (reg: CashRegisterManagementItem) => {
    setEditingRegister(reg);
    setRegisterName(reg.name);
    setRegisterCode(reg.code);
    setRegisterLocation(reg.location || "");
    setFormModalOpen(true);
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerCode.trim()) {
      toast.error("El nombre y el código identificador son obligatorios.");
      return;
    }

    setIsSavingForm(true);
    try {
      const payload = {
        name: registerName.trim(),
        code: registerCode.trim().toUpperCase(),
        location: registerLocation.trim() || null,
      };
      const res = editingRegister
        ? await updateCashRegisterAction({ id: editingRegister.id, ...payload })
        : await createCashRegisterAction(payload);

      if (res.success) {
        toast.success(
          editingRegister
            ? `Caja "${payload.name}" actualizada correctamente.`
            : `Caja "${payload.name}" registrada correctamente.`
        );
        setFormModalOpen(false);
        setEditingRegister(null);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo guardar la caja física.");
      }
    } catch {
      toast.error("Error al guardar la caja física.");
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      const res = await toggleCashRegisterArchiveAction({
        id: archiveTarget.id,
        archive: true,
      });
      if (res.success) {
        toast.success(`Caja "${archiveTarget.name}" archivada sin alterar su historial.`);
        setArchiveTarget(null);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo archivar la caja.");
      }
    } catch {
      toast.error("Error al archivar la caja.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreRegister = async (reg: CashRegisterManagementItem) => {
    try {
      const res = await toggleCashRegisterArchiveAction({
        id: reg.id,
        archive: false,
      });
      if (res.success) {
        toast.success(`Caja "${reg.name}" restaurada y disponible en Cajas.`);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo restaurar la caja.");
      }
    } catch {
      toast.error("Error al restaurar la caja.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCashRegisterAction({ id: deleteTarget.id });
      if (res.success) {
        toast.success(`Caja "${deleteTarget.name}" eliminada definitivamente.`);
        setDeleteTarget(null);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo eliminar la caja.");
      }
    } catch {
      toast.error("Error al eliminar la caja.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="admin-page-title">Ajustes</h1>
          <p className="admin-page-description">
            Configuración operativa del negocio y administración de terminales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/cajas"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-admin-card-border px-3.5 text-xs font-bold text-admin-secondary hover:bg-admin-raised"
          >
            Ir a Cajas y turnos
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-10 px-3 rounded-xl border-admin-card-border text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Sección: Cajas físicas */}
      <section className="admin-panel p-5 sm:p-6 space-y-5" aria-label="Cajas físicas">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-admin-text flex items-center gap-2">
              <Store className="h-4 w-4 text-admin-brand-text" />
              Cajas físicas y terminales POS
            </h2>
            <p className="text-xs text-admin-muted mt-0.5">
              {summary.activeCount} {summary.activeCount === 1 ? "activa" : "activas"} ·{" "}
              {summary.archivedCount} {summary.archivedCount === 1 ? "archivada" : "archivadas"} ·{" "}
              {summary.openShiftsCount} {summary.openShiftsCount === 1 ? "turno abierto" : "turnos abiertos"}
            </p>
          </div>

          <Button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva caja física</span>
          </Button>
        </div>

        <div className="admin-segments">
          <button
            type="button"
            onClick={() => setFilter("active")}
            aria-pressed={filter === "active"}
            className="admin-segment"
          >
            <span>Activas ({summary.activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("archived")}
            aria-pressed={filter === "archived"}
            className="admin-segment"
          >
            <span>Archivadas ({summary.archivedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className="admin-segment"
          >
            <span>Todas ({summary.totalCount})</span>
          </button>
        </div>

        <div className="rounded-xl border border-admin-card-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-admin-card-border bg-admin-raised text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Caja</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Historial</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-admin-brand-text" />
                      Cargando terminales registradas...
                    </td>
                  </tr>
                ) : filteredRegisters.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      {filter === "archived"
                        ? "No hay cajas archivadas."
                        : "No hay cajas físicas en esta vista."}
                    </td>
                  </tr>
                ) : (
                  filteredRegisters.map((reg) => (
                    <tr key={reg.id} className="hover:bg-admin-raised/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-admin-text">{reg.name}</div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-semibold text-admin-brand-text">
                            {reg.code}
                          </span>
                          <span>·</span>
                          <span>{reg.location || "Sin ubicación"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {reg.hasOpenShift ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Turno abierto
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {reg.openShiftNumber} · {reg.openShiftCashier}
                            </p>
                          </div>
                        ) : reg.isActive ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Archivada
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-admin-text">
                        {reg.shiftsCount} {reg.shiftsCount === 1 ? "turno" : "turnos"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Acciones para ${reg.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-admin-card-border text-admin-secondary hover:bg-admin-raised cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-56 bg-admin-card-bg text-admin-text border border-admin-card-border"
                          >
                            <DropdownMenuItem
                              onClick={() => openEditModal(reg)}
                              className="text-xs cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Editar / Renombrar</span>
                            </DropdownMenuItem>

                            {reg.isActive ? (
                              <DropdownMenuItem
                                disabled={reg.hasOpenShift}
                                onClick={() => {
                                  if (!reg.hasOpenShift) setArchiveTarget(reg);
                                }}
                                className="text-xs cursor-pointer"
                              >
                                <Archive className="h-3.5 w-3.5" />
                                <span>
                                  {reg.hasOpenShift ? "Archivar (turno abierto)" : "Archivar caja"}
                                </span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => void handleRestoreRegister(reg)}
                                className="text-xs cursor-pointer"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                <span>Restaurar caja</span>
                              </DropdownMenuItem>
                            )}

                            {reg.canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(reg)}
                                  className="text-xs cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Eliminar definitivamente</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-admin-muted">
          Puedes renombrar cualquier caja en todo momento. Solo las cajas sin turnos registrados se
          pueden eliminar; las que ya tienen historial se archivan para conservar intacta la
          auditoría contable.
        </p>
      </section>

      {/* Modal Crear / Editar Caja Física */}
      <Dialog
        open={formModalOpen}
        onOpenChange={(open) => {
          setFormModalOpen(open);
          if (!open) setEditingRegister(null);
        }}
      >
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-lg font-semibold text-admin-text flex items-center gap-2">
              <Store className="h-5 w-5 text-admin-brand-text" />
              {editingRegister ? "Editar Caja Física" : "Nueva Caja Física"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingRegister
                ? "Actualiza el nombre, código o ubicación de esta terminal sin afectar sus turnos registrados."
                : "Registra una terminal física para habilitar un nuevo punto de cobro en Cajas."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRegister} className="space-y-4 pt-3 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="register-name-input" className="text-xs font-bold text-admin-secondary">
                Nombre de la caja
              </label>
              <Input
                id="register-name-input"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Ej. Caja Principal - Mostrador"
                maxLength={80}
                className="h-10 text-xs rounded-xl border-admin-card-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="register-code-input" className="text-xs font-bold text-admin-secondary">
                  Código identificador
                </label>
                <Input
                  id="register-code-input"
                  value={registerCode}
                  onChange={(e) => setRegisterCode(e.target.value.toUpperCase())}
                  placeholder="POS-01"
                  maxLength={20}
                  className="h-10 text-xs font-mono font-bold rounded-xl border-admin-card-border uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-location-input" className="text-xs font-bold text-admin-secondary">
                  Ubicación (opcional)
                </label>
                <Input
                  id="register-location-input"
                  value={registerLocation}
                  onChange={(e) => setRegisterLocation(e.target.value)}
                  placeholder="Ej. Salón Principal"
                  maxLength={120}
                  className="h-10 text-xs rounded-xl border-admin-card-border"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-admin-card-border gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingForm}
                onClick={() => setFormModalOpen(false)}
                className="rounded-xl h-10 text-xs font-bold border-admin-card-border"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingForm}
                className="rounded-xl h-10 text-xs font-bold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-1.5 cursor-pointer"
              >
                {isSavingForm ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{editingRegister ? "Guardar cambios" : "Crear caja física"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Archivo */}
      <Dialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-base font-semibold text-admin-text flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-500" />
              Archivar caja física
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {archiveTarget?.name} ({archiveTarget?.code})
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-admin-secondary py-2 leading-relaxed">
            Al archivarla dejará de aparecer en <strong>Cajas y turnos</strong> para abrir nuevas
            jornadas, pero conservará intactos todos sus arqueos históricos y su registro en{" "}
            <strong>Ventas del día</strong>. Podrás restaurarla cuando quieras.
          </p>

          <DialogFooter className="pt-2 border-t border-admin-card-border gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isArchiving}
              onClick={() => setArchiveTarget(null)}
              className="rounded-xl h-9 text-xs font-bold border-admin-card-border"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isArchiving}
              onClick={handleConfirmArchive}
              className="rounded-xl h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              {isArchiving ? "Archivando..." : "Archivar caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación Definitiva */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-base font-semibold text-admin-text flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" />
              Eliminar caja definitivamente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {deleteTarget?.name} ({deleteTarget?.code})
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-admin-secondary py-2 leading-relaxed">
            Esta caja no tiene turnos ni movimientos registrados, por lo que puedes eliminarla por
            completo. Esta acción no se puede deshacer.
          </p>

          <DialogFooter className="pt-2 border-t border-admin-card-border gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl h-9 text-xs font-bold border-admin-card-border"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="rounded-xl h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {isDeleting ? "Eliminando..." : "Eliminar caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
