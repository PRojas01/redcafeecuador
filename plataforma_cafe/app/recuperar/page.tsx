"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";

function RecuperarContenido() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const pedirEnlace = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const r = await api.passwordResetRequest(email);
    setLoading(false);
    if (!r.ok) {
      setMsg({ tipo: "err", texto: r.error || "No pudimos procesar la solicitud." });
      return;
    }
    setMsg({
      tipo: "ok",
      texto: "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.",
    });
  };

  const cambiarPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPass.length < 6) {
      setMsg({ tipo: "err", texto: "La nueva contraseña debe tener mínimo 6 caracteres." });
      return;
    }
    if (newPass !== confirm) {
      setMsg({ tipo: "err", texto: "Las contraseñas no coinciden." });
      return;
    }
    setLoading(true);
    const r = await api.passwordResetConfirm(token, newPass, confirm);
    setLoading(false);
    if (!r.ok) {
      setMsg({ tipo: "err", texto: r.error || "El enlace no es válido o ya caducó." });
      return;
    }
    setNewPass("");
    setConfirm("");
    setMsg({ tipo: "ok", texto: "Contraseña cambiada correctamente. Ya puedes entrar con la nueva contraseña." });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">
        Recuperación
      </p>
      <h1 className="mt-1 font-titulo text-3xl font-bold text-coffee-900 md:text-4xl">
        {token ? "Crea una nueva contraseña" : "Recupera tu contraseña"}
      </h1>
      <p className="mt-2 text-text-secondary">
        {token
          ? "Escribe una contraseña nueva para volver a entrar a tu perfil."
          : "Te enviaremos un enlace seguro al correo de tu cuenta. Funciona para todos los perfiles de la Red."}
      </p>

      <form onSubmit={token ? cambiarPass : pedirEnlace} className="card mt-6 space-y-4 p-6 shadow-sm">
        {token ? (
          <>
            <div>
              <label className="text-xs font-semibold text-coffee-700">Nueva contraseña</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-coffee-700">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs font-semibold text-coffee-700">Correo de tu cuenta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
        )}

        {msg && (
          <p className={`rounded-xl p-3 text-center text-sm font-semibold ${
            msg.tipo === "ok" ? "bg-green-700/10 text-green-800" : "bg-danger/10 text-danger"
          }`}>
            {msg.texto}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Procesando..." : token ? "Cambiar contraseña" : "Enviar enlace"}
        </button>
      </form>

      <Link href="/login" className="mt-5 inline-flex text-sm font-semibold text-green-700 underline">
        Volver al login
      </Link>
    </div>
  );
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14">Cargando...</div>}>
      <RecuperarContenido />
    </Suspense>
  );
}
