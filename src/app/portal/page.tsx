"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Store,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loginAction } from "@/app/admin/actions/auth";

// Directorio de usuarios del sistema para acceso rápido
const systemRoles = [
  {
    role: "Administrador",
    email: "admin@aurastudio.com",
    label: "Acceso Total & KPIs",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  {
    role: "Supervisor",
    email: "supervisor@aurastudio.com",
    label: "Arqueos, PIN & Auditoría",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    role: "Cajera",
    email: "cajera@aurastudio.com",
    label: "Punto de Venta POS",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    role: "Almacenero",
    email: "almacen@aurastudio.com",
    label: "Inventario & Kardex",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
];

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [email, setEmail] = useState("admin@aurastudio.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);

  const handleRoleSelect = (index: number) => {
    setSelectedRoleIndex(index);
    setEmail(systemRoles[index].email);
    setPassword("password123");
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginAction(email, password);

      if (res.success && res.user) {
        toast.success(`¡Bienvenido al sistema, ${res.user.name}!`, {
          description: `Sesión iniciada como ${res.user.role.toUpperCase()}.`,
        });

        // Si venía de una ruta protegida y su rol lo permite, ir allá; sino a su home predeterminado
        const targetUrl = returnTo && returnTo.startsWith("/admin") ? returnTo : res.redirectTo || "/admin";
        router.push(targetUrl);
        router.refresh();
      } else {
        const err = res.error || "Credenciales inválidas.";
        setErrorMessage(err);
        toast.error(err);
      }
    } catch {
      const err = "Error de conexión al servidor de autenticación.";
      setErrorMessage(err);
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f9] dark:bg-[#0b0e17] flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none font-sans">
      {/* Fondo con brillo ambiental sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* 1. Header Superior: Logo y Enlace a la Tienda */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/30 group-hover:scale-105 transition-transform shrink-0">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-1">
              Aura <span className="text-[#0284c7] dark:text-[#38bdf8] font-bold">Commerce</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              ERP & Punto de Venta Bolivia
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 shadow-sm transition-all"
        >
          <Store className="h-3.5 w-3.5 text-[#0284c7]" />
          <span>Ver Tienda Online</span>
        </Link>
      </header>

      {/* 2. Bento Container Principal */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[2.5rem] bg-white dark:bg-[#11162b] border border-slate-200/80 dark:border-[#1e2648] shadow-2xl shadow-indigo-950/10 overflow-hidden">
          
          {/* Panel Izquierdo: Directorio de Usuarios y Roles */}
          <div className="lg:col-span-5 bg-[#0b1329] p-8 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1e2648]">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-600/20 rounded-full blur-[80px] pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[11px] font-bold px-3 py-1 gap-1.5 w-fit">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                Control de Acceso Seguro
              </Badge>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Estación de Trabajo & POS
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Sistema autenticado con roles independientes: caja registradora, supervisión con PIN numérico y control de inventario en tiempo real.
                </p>
              </div>

              {/* Selector Rápido de Cuenta */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Seleccionar usuario del sistema:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {systemRoles.map((r, i) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleRoleSelect(i)}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer",
                        selectedRoleIndex === i
                          ? "bg-sky-950/80 border-sky-500 shadow-md shadow-sky-600/30 text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs">{r.role}</span>
                        {selectedRoleIndex === i && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                        )}
                      </div>
                      <span className="text-[10px] block text-slate-400 truncate mt-0.5">
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del panel izquierdo: Estado del servidor */}
            <div className="pt-6 border-t border-[#1e2648] mt-6 flex items-center justify-between text-xs text-slate-400 relative z-10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-300">Neon PostgreSQL Conectado</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                <span>Cookies Seguras</span>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Formulario de Login Auténtico */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white dark:bg-[#11162b]/40">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Iniciar Sesión
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ingresa con tu correo institucional y contraseña para entrar al ERP.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Campo: Correo Electrónico */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="usuario@aurastudio.com"
                      className="pl-10 h-11 text-xs rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 font-medium focus:border-sky-600"
                    />
                  </div>
                </div>

                {/* Campo: Contraseña */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info("Contacta al Administrador General para restablecer tu clave o PIN.")}
                      className="text-[11px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="pl-10 pr-10 h-11 text-xs rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 font-medium focus:border-sky-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Botón de Ingreso Principal */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] active:scale-[0.98] text-white text-xs font-black gap-2 shadow-lg shadow-[#0284c7]/25 transition-all mt-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Ingresar al Sistema</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Nota de pie */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                <span>¿Problemas para acceder a tu terminal? Consulta con el </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Supervisor de Turno</span>.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer Minimalista */}
      <footer className="max-w-6xl w-full mx-auto text-center text-[11px] text-slate-400 dark:text-slate-500 z-10">
        Aura Commerce POS © 2026 • Arquitectura Next.js 16 & Neon PostgreSQL
      </footer>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f9] dark:bg-[#0b0e17] flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#0284c7] animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Cargando portal seguro...</span>
          </div>
        </div>
      }
    >
      <PortalLoginForm />
    </Suspense>
  );
}
