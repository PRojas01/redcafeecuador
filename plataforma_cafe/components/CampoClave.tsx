"use client";

// Campo de contraseña con botón «ver / ocultar». Antes la capa propia añadía
// ese botón como hermano de cada <input type="password"> de React y lo
// colocaba con position:fixed. Ahora es parte del propio campo.
import { useState, type InputHTMLAttributes } from "react";

export function CampoClave({ style, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [ver, setVer] = useState(false);
  return (
    <span className="relative block w-full">
      <input {...props} type={ver ? "text" : "password"} style={{ ...style, paddingRight: "2.75rem" }} />
      <button
        type="button"
        className={"redcafe-ver-clave" + (ver ? " redcafe-ver-clave-activa" : "")}
        aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={ver}
        onClick={() => setVer((v) => !v)}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
      >
        <svg className="redcafe-ojo" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg className="redcafe-ojo-oculto" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </button>
    </span>
  );
}
