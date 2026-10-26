"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, getStoredSession, type Post, type ApiUser } from "@/lib/api";
import { EstadoError } from "@/components/EstadoError";
import { EstadoVacio } from "@/components/EstadoVacio";
import { CulturaCafe, NoticiasSector } from "@/components/CulturaYNoticias";

export default function ComunidadPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [me, setMe] = useState<ApiUser | null>(null);
  const [titulo, setTitulo] = useState("");
  const [text, setText] = useState("");
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const cargar = async () => {
    setErrorCarga(false);
    const local = getStoredSession();
    if (local) setMe(local);
    const [p, m] = await Promise.all([api.postsList(), api.me()]);
    if (p.ok && p.data) setPosts((p.data as { posts: Post[] }).posts);
    else setPosts([]);
    if (!p.ok) setErrorCarga(true);
    if (m.ok && m.data) {
      const user = (m.data as { user: ApiUser | null }).user ?? null;
      if (user || !local) setMe(user);
    }
  };

  useEffect(() => { cargar(); }, []);

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!me) { setError("Inicia sesión para publicar."); return; }
    setSubiendo(true);
    const urls: string[] = [];
    for (const file of imagenes) {
      const up = await api.uploadImage(file, "comunidad");
      if (!up.ok || !up.data?.url) {
        setSubiendo(false);
        setError(up.status === 401 ? "Tu sesión del servidor caducó. Vuelve a entrar para publicar." : up.error || "No pudimos subir una imagen.");
        return;
      }
      urls.push(up.data.url);
    }
    const r = await api.postCreate(titulo, text, urls);
    setSubiendo(false);
    if (!r.ok) {
      setError(r.status === 401 ? "Tu sesión del servidor caducó. Vuelve a entrar para publicar." : r.error || "Error");
      return;
    }
    setTitulo(""); setText(""); setImagenes([]);
    cargar();
  };

  const seleccionarImagenes = (files: FileList | null) => {
    const elegidas = Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/") && file.size <= 2 * 1024 * 1024)
      .slice(0, 6);
    setImagenes(elegidas);
    if ((files?.length ?? 0) > elegidas.length) setError("Puedes adjuntar hasta 6 imágenes JPG, PNG o WebP de máximo 2 MB.");
  };

  const toggleLike = async (id: string) => {
    if (!me) return;
    await api.postLike(id);
    cargar();
  };

  const comentar = async (id: string) => {
    if (!me) return;
    const t = window.prompt("Tu comentario");
    if (t && t.trim()) { await api.postComment(id, t.trim()); cargar(); }
  };

  const irAFormulario = () => {
    if (!me) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">
        Comunidad
      </p>
      <h1 className="mt-1 font-titulo text-3xl font-bold text-coffee-900 md:text-4xl">
        La conversación del café ecuatoriano
      </h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Comparte experiencias, preguntas, oportunidades, recetas, eventos y conocimiento
        con otros miembros de la Red.
      </p>

      {me ? (
        <form ref={formRef} id="nueva-publicacion" onSubmit={publicar} className="card mt-6 space-y-3 p-5">
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">Título</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="¿De qué trata tu publicación?"
              className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">Contenido</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cuenta una experiencia, pregunta u oportunidad para la Red."
              rows={3}
              className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
              required
            />
          </label>
          <label className="block rounded-xl border border-dashed border-border-soft bg-surface-soft p-3">
            <span className="text-xs font-semibold text-text-secondary">Imágenes opcionales</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => seleccionarImagenes(e.target.files)}
              className="mt-2 block w-full text-sm text-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-green-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
            {imagenes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                {imagenes.map((img) => <span key={`${img.name}-${img.size}`} className="rounded-full bg-white px-2 py-1">{img.name}</span>)}
              </div>
            )}
          </label>
          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
          <button disabled={subiendo} className="btn-primary disabled:opacity-60">{subiendo ? "Publicando..." : "Publicar"}</button>
        </form>
      ) : (
        <div className="card mt-6 p-5 text-sm text-text-secondary">
          Para publicar, <Link href="/login" className="font-semibold text-green-700 underline">inicia sesión</Link> o{" "}
          <Link href="/afiliate" className="font-semibold text-green-700 underline">afíliate</Link>.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {errorCarga ? (
          <EstadoError
            titulo="No pudimos cargar las publicaciones"
            descripcion="Vuelve a intentarlo en un momento."
            onReintentar={cargar}
          />
        ) : posts.length === 0 ? (
          <EstadoVacio
            icono="comunidad"
            titulo="Comparte algo con la Red"
            descripcion="Publica una pregunta, experiencia u oportunidad para iniciar una conversación."
            cta="Crear publicación"
            href={me ? undefined : "/afiliate"}
            onCta={me ? irAFormulario : undefined}
          />
        ) : (
          posts.map((p) => (
          <article key={p.id} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-coffee-900">{p.autor}</p>
              <span className="badge">{p.autor_rol}</span>
            </div>
            <h2 className="mt-1 font-titulo text-xl font-bold text-coffee-900">{p.titulo}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{p.text}</p>
            {p.imagenes && p.imagenes.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.imagenes.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Imagen de ${p.titulo}`}
                    className="aspect-[4/3] w-full rounded-xl border border-border-soft object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-text-muted">{new Date(p.created_at).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => toggleLike(p.id)} disabled={!me} className="rounded-full border border-green-700/50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50">
                ♥ {p.likes?.length ?? 0}
              </button>
              <button onClick={() => comentar(p.id)} disabled={!me} className="rounded-full border border-gold-500/60 px-3 py-1 text-xs font-semibold text-coffee-700 hover:bg-cream-200 disabled:opacity-50">
                {p.comments?.length ?? 0} comentarios
              </button>
            </div>
            {p.comments && p.comments.length > 0 && (
              <div className="mt-3 space-y-2 border-l-2 border-border-soft pl-3">
                {p.comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-semibold text-coffee-900">{c.autor}:</span>{" "}
                    <span className="text-text-secondary">{c.text}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
          )))}
        </div>

        {/* Cultura del café y noticias del sector (antes al final de la portada). */}
        <CulturaCafe />
        <NoticiasSector />
      </div>
  );
}
