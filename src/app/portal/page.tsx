"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginAction } from "@/app/admin/actions/auth";

export default function PortalLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        const returnTo = new URLSearchParams(window.location.search).get("returnTo");
        const targetUrl = returnTo && /^\/admin(?:\/[a-zA-Z0-9_-]+)*$/.test(returnTo) ? returnTo : res.redirectTo || "/admin";
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
    <main className="admin-login">
      <div className="admin-login-brand">
        <Link href="/" className="flex w-fit items-center gap-3 text-sm font-semibold">
          <span className="admin-rail-mark"><Activity size={19} aria-hidden /></span>
          Aura Commerce
        </Link>
        <div className="hidden lg:block">
          <p className="max-w-xs text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.055em]">
            Administración de tienda
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-admin-sidebar-text">
            Ventas, inventario y caja.
          </p>
        </div>
        <Link href="/" className="flex w-fit items-center gap-2 text-sm text-admin-sidebar-text hover:text-admin-on-solid">
          <ArrowLeft size={16} aria-hidden /> Volver a la tienda
        </Link>
      </div>

      <div className="grid min-w-0 place-items-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm rounded-xl border border-admin-card-border bg-admin-card-bg p-6 sm:p-8">
          <h1 className="admin-page-title">Iniciar sesión</h1>
          <p className="admin-page-description">Usa tu cuenta para entrar al panel.</p>

          <form onSubmit={handleLogin} className="mt-6 grid gap-4">
            {errorMessage && <p role="alert" className="text-sm text-admin-danger">{errorMessage}</p>}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="portal-email">Correo electrónico</label>
              <Input id="portal-email" type="email" autoComplete="username" value={email} required
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 border-admin-card-border bg-admin-raised focus-visible:border-admin-brand" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="portal-password">Contraseña</label>
              <div className="relative">
                <Input id="portal-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  value={password} required onChange={(event) => setPassword(event.target.value)}
                  className="h-10 border-admin-card-border bg-admin-raised pr-11 focus-visible:border-admin-brand" />
                <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-admin-muted"
                  onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="h-10 bg-admin-brand text-admin-on-solid hover:bg-admin-brand-hover">
              {loading ? "Iniciando sesión…" : <>Entrar al panel <ArrowRight size={16} aria-hidden /></>}
            </Button>
          </form>
          <p className="mt-5 text-sm text-admin-muted">Si olvidaste tu contraseña, contacta a tu administrador.</p>
        </div>
      </div>
    </main>
  );
}
