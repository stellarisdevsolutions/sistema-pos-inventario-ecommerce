"use client";

import { useState, useEffect, useMemo } from "react";
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
  UserPlus,
  ShieldCheck,
  Search,
  KeyRound,
  Phone,
  Mail,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Power,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  type UserListItem,
  type UsersKpisSummary,
} from "@/app/admin/actions/users";
import type { UserFormInput } from "@/lib/validations/user";

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [kpis, setKpis] = useState<UsersKpisSummary>({
    totalUsers: 0,
    adminsCount: 0,
    cashiersCount: 0,
    activeUsersCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal Crear Usuario
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormInput>({
    name: "",
    email: "",
    password: "",
    pin: "",
    role: "cashier",
    phone: "",
    isActive: true,
  });

  // Modal Editar Usuario
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: "admin" | "manager" | "cashier" | "warehouse";
    phone: string;
    password: "";
    pin: string;
    isActive: boolean;
  }>({
    name: "",
    email: "",
    role: "cashier",
    phone: "",
    password: "",
    pin: "",
    isActive: true,
  });

  const loadUsersData = async () => {
    setIsLoading(true);
    try {
      const res = await getUsersAction();
      if (res.success) {
        setUsers(res.users);
        setKpis(res.kpis);
      } else {
        toast.error(res.error || "Error al cargar la lista de usuarios.");
      }
    } catch {
      toast.error("Error de conexión al cargar usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Manejador Crear Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast.error("Por favor completa el nombre y correo electrónico.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await createUserAction(createForm);
      if (res.success) {
        toast.success(`Usuario "${createForm.name}" creado correctamente.`);
        setCreateModalOpen(false);
        setCreateForm({
          name: "",
          email: "",
          password: "",
          pin: "",
          role: "cashier",
          phone: "",
          isActive: true,
        });
        loadUsersData();
      } else {
        toast.error(res.error || "No se pudo registrar el usuario.");
      }
    } catch {
      toast.error("Ocurrió un error inesperado.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Abrir Modal Editar
  const openEditModal = (user: UserListItem) => {
    setUserToEdit(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      password: "",
      pin: "",
      isActive: user.isActive,
    });
    setEditModalOpen(true);
  };

  // Manejador Guardar Edición
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setIsSubmittingEdit(true);
    try {
      const res = await updateUserAction(userToEdit.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        phone: editForm.phone,
        pin: editForm.pin || undefined,
        password: editForm.password ? editForm.password : undefined,
        isActive: editForm.isActive,
      });

      if (res.success) {
        toast.success(`Datos de ${editForm.name} actualizados.`);
        setEditModalOpen(false);
        setUserToEdit(null);
        loadUsersData();
      } else {
        toast.error(res.error || "No se pudo actualizar el usuario.");
      }
    } catch {
      toast.error("Error al guardar cambios.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Alternar Estado Activo / Inactivo
  const handleToggleStatus = async (user: UserListItem) => {
    try {
      const res = await toggleUserStatusAction(user.id);
      if (res.success) {
        toast.success(
          user.isActive
            ? `Usuario ${user.name} desactivado.`
            : `Usuario ${user.name} activado.`
        );
        loadUsersData();
      } else {
        toast.error(res.error || "No se pudo cambiar el estado del usuario.");
      }
    } catch {
      toast.error("Error al actualizar estado.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header Principal */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-page-title">Usuarios y roles</h1>
          </div>
          <p className="admin-page-description">Administra las cuentas y los permisos del panel.</p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-2 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuevo Usuario</span>
        </Button>
      </div>

      {/* 2. Tarjetas Bento de Resumen */}
      <div className="admin-kpi-grid">
        <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Usuarios
          </span>
          <p className="text-xl font-semibold text-admin-text mt-1">
            {kpis.totalUsers}
          </p>
          <span className="text-[10px] text-slate-400">Registrados en la plataforma</span>
        </div>

        <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-4">
          <span className="text-[10px] font-bold text-admin-brand-text uppercase tracking-wider block">
            Supervisores & Admins
          </span>
          <p className="text-xl font-semibold text-admin-brand-text mt-1">
            {kpis.adminsCount}
          </p>
          <span className="text-[10px] text-slate-400">Con autorización de arqueo y PIN</span>
        </div>

        <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-4">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Cajeros de Mostrador
          </span>
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.cashiersCount}
          </p>
          <span className="text-[10px] text-slate-400">Habilitados para operar turnos</span>
        </div>

        <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-4">
          <span className="text-[10px] font-bold text-admin-brand-text uppercase tracking-wider block">
            Usuarios Activos
          </span>
          <p className="text-xl font-semibold text-admin-brand-text mt-1">
            {kpis.activeUsersCount}
          </p>
          <span className="text-[10px] text-slate-400">Con acceso habilitado al sistema</span>
        </div>
      </div>

      {/* 3. Filtros y Búsqueda */}
      <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="pl-9 h-10 text-xs rounded-xl bg-admin-raised border-admin-card-border"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-admin-secondary font-medium cursor-pointer"
          >
            <option value="all">Todos los Roles</option>
            <option value="admin">Administrador General</option>
            <option value="manager">Supervisor de Tienda</option>
            <option value="cashier">Cajero de Mostrador</option>
            <option value="warehouse">Almacenero</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={loadUsersData}
            disabled={isLoading}
            className="h-10 px-3 rounded-xl border-admin-card-border text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* 4. Tabla de Usuarios */}
      <div className="rounded-xl bg-admin-card-bg border border-admin-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Rol & Permisos</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4 text-center">PIN de Autorización</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-card-border font-medium text-admin-secondary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No se encontraron usuarios coincidentes.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-admin-raised transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-admin-raised flex items-center justify-center font-semibold text-admin-secondary text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-admin-text leading-tight">
                            {user.name}
                          </p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            user.role === "admin"
                              ? "bg-admin-brand"
                              : user.role === "manager"
                              ? "bg-admin-brand"
                              : user.role === "cashier"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          )}
                        />
                        <span
                          className={cn(
                            user.role === "admin"
                              ? "text-admin-brand-text"
                              : user.role === "manager"
                              ? "text-admin-brand-text"
                              : user.role === "cashier"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          )}
                        >
                          {user.role === "admin"
                            ? "Administrador General"
                            : user.role === "manager"
                            ? "Supervisor de Tienda"
                            : user.role === "cashier"
                            ? "Cajero de Mostrador"
                            : "Almacenero"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-admin-muted">
                      {user.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {user.role === "admin" || user.role === "manager" ? (
                        user.hasPin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-admin-raised text-slate-800 dark:text-slate-200 border border-admin-card-border">
                            <KeyRound className="h-3 w-3 text-emerald-600" />
                            Configurado (●●●●)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                            Sin PIN asignado
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">No requerido</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span className={cn("h-2 w-2 rounded-full", user.isActive ? "bg-emerald-500" : "bg-rose-500")} />
                        <span className={user.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          className="h-8 rounded-lg text-xs gap-1 border-admin-card-border text-admin-secondary hover:text-slate-900 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </Button>

                        {/* Botón Activar / Desactivar */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={user.id === 1}
                          onClick={() => handleToggleStatus(user)}
                          className={cn(
                            "h-8 rounded-lg text-xs gap-1 cursor-pointer",
                            user.isActive
                              ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          )}
                          title={user.id === 1 ? "El administrador principal no puede ser desactivado" : undefined}
                        >
                          <Power className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {user.isActive ? "Desactivar" : "Activar"}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal Crear Nuevo Usuario */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-xl bg-admin-card-bg border border-admin-card-border">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center mb-2">
              <UserPlus className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-semibold text-admin-text">
              Registrar Nuevo Usuario
            </DialogTitle>
            <DialogDescription className="text-xs text-admin-muted">
              Crea un nuevo miembro del equipo y asígnale su rol dentro del negocio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Nombre Completo *
              </label>
              <Input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Ej: Carmen Gómez"
                className="h-9 text-xs rounded-xl bg-admin-raised"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Correo Electrónico (Login) *
              </label>
              <Input
                required
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="carmen@auracommerce.com"
                className="h-9 text-xs rounded-xl bg-admin-raised"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rol del Usuario *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="cashier">Cajero de Mostrador</option>
                  <option value="manager">Supervisor de Tienda</option>
                  <option value="admin">Administrador General</option>
                  <option value="warehouse">Almacenero</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Teléfono (Opcional)
                </label>
                <Input
                  value={createForm.phone || ""}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+591 70000000"
                  className="h-9 text-xs rounded-xl bg-admin-raised"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Contraseña Inicial (Mínimo 6 caracteres)
              </label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Por defecto: aura123456"
                className="h-9 text-xs rounded-xl bg-admin-raised"
              />
            </div>

            {/* Si es Admin o Supervisor: PIN de autorización */}
            {(createForm.role === "admin" || createForm.role === "manager") && (
              <div className="p-3 rounded-xl bg-admin-brand-subtle border border-admin-brand-light space-y-1.5">
                <div className="flex items-center gap-1.5 text-admin-brand-text font-bold text-xs">
                  <KeyRound className="h-3.5 w-3.5 text-admin-brand-text" />
                  <span>PIN de Autorización en Mostrador (4-6 dígitos)</span>
                </div>
                <p className="text-[10px] text-admin-brand-text">
                  Este PIN permite al supervisor autorizar devoluciones de clientes y validar arqueos de caja rápidamente.
                </p>
                <Input
                  type="password"
                  maxLength={6}
                  value={createForm.pin || ""}
                  onChange={(e) => setCreateForm({ ...createForm, pin: e.target.value })}
                  placeholder="Ej: 1234"
                  className="h-8 text-xs font-mono font-bold tracking-widest bg-admin-card-bg border-admin-brand-light w-32"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCreate}
                className="h-9 text-xs rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-bold"
              >
                {isSubmittingCreate ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Usuario</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Modal Editar Usuario */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-xl bg-admin-card-bg border border-admin-card-border">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center mb-2">
              <Edit2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-semibold text-admin-text">
              Editar Usuario: {userToEdit?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-admin-muted">
              Modifica el rol, teléfono, contraseña o PIN de autorización.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Nombre Completo
              </label>
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-9 text-xs rounded-xl bg-admin-raised"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Correo Electrónico
              </label>
              <Input
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="h-9 text-xs rounded-xl bg-admin-raised"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rol del Usuario
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="cashier">Cajero de Mostrador</option>
                  <option value="manager">Supervisor de Tienda</option>
                  <option value="admin">Administrador General</option>
                  <option value="warehouse">Almacenero</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Teléfono
                </label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+591 70000000"
                  className="h-9 text-xs rounded-xl bg-admin-raised"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cambiar Contraseña (Dejar vacío para no cambiar)
              </label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value as any })}
                placeholder="Nueva contraseña..."
                className="h-9 text-xs rounded-xl bg-admin-raised"
              />
            </div>

            {/* PIN de autorización */}
            {(editForm.role === "admin" || editForm.role === "manager") && (
              <div className="p-3 rounded-xl bg-admin-brand-subtle border border-admin-brand-light space-y-1.5">
                <div className="flex items-center gap-1.5 text-admin-brand-text font-bold text-xs">
                  <KeyRound className="h-3.5 w-3.5 text-admin-brand-text" />
                  <span>PIN de Autorización (4-6 dígitos)</span>
                </div>
                <p className="text-[10px] text-admin-brand-text">
                  PIN numérico para validar devoluciones y autorizar operaciones restringidas.
                </p>
                <Input
                  type="password"
                  maxLength={6}
                  value={editForm.pin}
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                  placeholder="Ej: 1234"
                  className="h-8 text-xs font-mono font-bold tracking-widest bg-admin-card-bg border-admin-brand-light w-32"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingEdit}
                className="h-9 text-xs rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-bold"
              >
                {isSubmittingEdit ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
