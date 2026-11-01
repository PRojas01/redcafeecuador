"use client";

import { AvisoSancion, verSancionPorEnlace, type SancionTitular } from "@/components/CuentaPropia";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getStoredSession, setStoredSession, type ApiUser } from "@/lib/api";

type Step = "creds" | "code";

interface PendingData {
 to: string;
 devCode: string | null;
}

export default function LoginPage() {
 const router = useRouter();
 const [step, setStep] = useState<Step>("creds");
 const [email, setEmail] = useState("");
 const [pass, setPass] = useState("");
 const [code, setCode] = useState("");
 const [pending, setPending] = useState<PendingData | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [resendCountdown, setResendCountdown] = useState(0);
 const [rememberEmail, setRememberEmail] = useState(false);
 const [keepSignedIn, setKeepSignedIn] = useState(true);
 const [sancion, setSancion] = useState<SancionTitular | null>(null);

 // Redirect automático si ya hay sesión activa
 useEffect(() => {
   // Enlace del correo de notificación: /login/?apelacion=ID&u=UID&t=FIRMA
   const q = new URLSearchParams(window.location.search);
   if (q.get("apelacion") && q.get("u") && q.get("t")) {
     verSancionPorEnlace(q.get("apelacion")!, q.get("u")!, q.get("t")!).then((s) => s && setSancion(s));
   }
   const savedEmail = localStorage.getItem("redcafe_login_email");
   if (savedEmail) {
     setEmail(savedEmail);
     setRememberEmail(true);
   }
   const sesion = getStoredSession();
   if (sesion) {
     router.replace("/panel");
     return;
   }
   api.me().then((r) => {
     if (r.ok && r.data) {
       const data = r.data as { user: ApiUser | null; requires_2fa?: boolean };
       if (data.user && !data.requires_2fa) {
         setStoredSession(data.user);
         router.replace("/panel");
       }
     }
   });
 }, []);

 const submitCreds = async (e: React.FormEvent) => {
 e.preventDefault();
 setError(null);
 setLoading(true);
 if (rememberEmail) localStorage.setItem("redcafe_login_email", email.trim());
 else localStorage.removeItem("redcafe_login_email");
 const r = await api.login(email, pass, keepSignedIn);
 setLoading(false);
 if (!r.ok || !r.data) {
   const s = r.status === 403 && r.raw && (r.raw.sancion as SancionTitular | undefined);
   if (s) setSancion(s);
   setError(r.error || "Error"); return;
 }

 const data = r.data as {
 requires_2fa?: boolean;
 user?: ApiUser;
 to?: string;
 dev_code?: string | null;
 };

 if (data.requires_2fa) {
 setPending({ to: data.to ?? "", devCode: data.dev_code ?? null });
 setStep("code");
 startCountdown();
 } else if (data.user) {
 setStoredSession(data.user, keepSignedIn);
 router.push("/panel?bienvenida=1");
 }
 };

 const startCountdown = () => {
 setResendCountdown(60);
 const id = setInterval(() => {
 setResendCountdown((c) => {
 if (c <= 1) { clearInterval(id); return 0; }
 return c - 1;
 });
 }, 1000);
 };

 const submitCode = async (e: React.FormEvent) => {
 e.preventDefault();
 setError(null);
 setLoading(true);
 const r = await api.twoFactorVerify(code);
 setLoading(false);
 if (!r.ok || !r.data) { setError(r.error || "Código incorrecto."); return; }
 const u = (r.data as { user: ApiUser }).user;
 setStoredSession(u, keepSignedIn);
 router.push("/panel?bienvenida=1");
 };

 const reenviar = async () => {
 if (resendCountdown > 0) return;
 setError(null);
 const r = await api.twoFactorResend();
 if (r.ok && r.data) {
 const d = r.data as { dev_code?: string | null };
 if (d.dev_code) {
 setPending((p) => p ? { ...p, devCode: d.dev_code ?? null } : p);
 }
 startCountdown();
 }
 };

 const cancelar = async () => {
 await api.twoFactorCancel();
 setStep("creds");
 setCode("");
 setPending(null);
 setError(null);
 };

return (
    <div className="mx-auto max-w-md px-4 py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">
        Acceso
      </p>
      <h1 className="mt-1 font-titulo text-3xl font-bold text-coffee-900 md:text-4xl">
        {step === "creds" ? "Entra a Red Café Ecuador" : "Verificación en 2 pasos"}
      </h1>

      {sancion && <AvisoSancion sancion={sancion} />}

      {step === "creds" ? (
        <>
          <p className="mt-2 text-text-secondary">
            Accede a tu perfil, publicaciones, cursos y herramientas. ¿No tienes cuenta?{" "}
            <Link href="/afiliate" className="font-semibold text-green-700 underline">Afíliate aquí</Link>.
          </p>

          <form onSubmit={submitCreds} className="card mt-6 space-y-4 p-6 shadow-sm">
            <div>
              <label className="text-xs font-semibold text-coffee-700">Correo</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-coffee-700">Contraseña</label>
                <Link href="/recuperar" className="text-xs font-semibold text-green-700 underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-2 rounded-xl bg-cream-100/60 p-3 text-sm text-text-secondary">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>Recordar mi correo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>Mantener iniciada la sesión</span>
              </label>
            </div>
            {error && <p className="rounded-xl bg-danger/10 p-3 text-center text-sm font-semibold text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Continuar →"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-text-secondary">
            Te enviamos un código de 6 dígitos a tu correo{" "}
            <strong className="text-coffee-900">{pending?.to}</strong>. Ingrésalo abajo para entrar.
          </p>

          {/* Aviso modo dev cuando mail() falla */}
          {pending?.devCode && (
            <div className="mt-3 rounded-xl border-2 border-gold-500/60 bg-gold-500/10 p-3 text-sm">
              <p className="font-semibold text-coffee-900">MODO DESARROLLO</p>
              <p className="mt-1 text-text-secondary">
                El servidor no pudo enviar el email (GoDaddy compartido suele bloquear SMTP externo).
                Tu código es:
              </p>
              <p className="mt-2 select-all rounded bg-cream-100 p-2 text-center font-mono text-xl font-bold tracking-widest text-coffee-900">
                {pending.devCode}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                En producción real recibirías este código por email.
              </p>
            </div>
          )}

          <form onSubmit={submitCode} className="card mt-6 space-y-4 p-6 shadow-sm">
            <div>
              <label className="text-xs font-semibold text-coffee-700">Código de verificación</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="123456 o XXXX-XXXX (cód. respaldo)"
                className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-center font-mono text-2xl tracking-widest"
                maxLength={9}
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-text-muted">
                Si no tienes acceso a tu email, usa un código de respaldo (formato XXXX-XXXX).
              </p>
            </div>
            {error && <p className="rounded-xl bg-danger/10 p-3 text-center text-sm font-semibold text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Entrar"}
            </button>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={cancelar} className="text-text-muted underline hover:text-coffee-900">
                ← Cancelar
              </button>
              <button
                type="button"
                onClick={reenviar}
                disabled={resendCountdown > 0}
                className="text-green-700 underline hover:text-green-800 disabled:text-text-muted"
              >
                {resendCountdown > 0 ? `Reenviar en ${resendCountdown}s` : "Reenviar código"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
