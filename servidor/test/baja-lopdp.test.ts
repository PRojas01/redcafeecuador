import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Base en memoria: colecciones de documentos y tablas de Prisma mínimas.
const m = vi.hoisted(() => ({ cols: {} as Record<string, any>, usuarios: {} as Record<string, any>, borradas: [] as string[] }));
const tabla = (nombre: string) => ({
  deleteMany: vi.fn(async ({ where }: any) => { m.borradas.push(`${nombre}:${where.usuarioId ?? where.id}`); return { count: 0 }; }),
  findMany: vi.fn(async () => []),
});
vi.mock("../src/lib/db.js", () => ({
  db: {
    usuario: {
      findUnique: vi.fn(async ({ where }: any) => m.usuarios[where.id] ?? null),
      update: vi.fn(async ({ where, data }: any) => Object.assign(m.usuarios[where.id], data)),
    },
    sesion: tabla("sesion"), codigoRespaldo: tabla("codigoRespaldo"), otp: tabla("otp"), recuperacionPass: tabla("recuperacionPass"),
    consentimiento: tabla("consentimiento"),
    documento: {
      deleteMany: vi.fn(async ({ where }: any) => {
        const c = m.cols[where.coleccion] ?? {};
        const n = where.id in c ? 1 : 0;
        delete c[where.id];
        return { count: n };
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const d = m.cols[where.coleccion_id.coleccion]?.[where.coleccion_id.id];
        return d ? { datos: d } : null;
      }),
    },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
  },
}));
vi.mock("../src/lib/docs.js", () => ({
  listar: vi.fn(async (col: string) => structuredClone(m.cols[col] ?? [])),
  mapa: vi.fn(async (col: string) => structuredClone(m.cols[col] ?? {})),
  mutar: vi.fn(async (col: string, fn: any) => (m.cols[col] = await fn(structuredClone(m.cols[col] ?? []), null))),
  mutarMapa: vi.fn(async (col: string, fn: any) => (m.cols[col] = await fn(structuredClone(m.cols[col] ?? {}), null))),
}));
vi.mock("../src/lib/pii.js", () => ({ descifrar: (s: string) => s.replace(/^cifrado:/, "") }));

const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "redcafe-baja-"));
process.env.REDCAFE_SITIO = path.join(temporal, "publico");
process.env.REDCAFE_UPLOADS = path.join(temporal, "publico", "uploads");
process.env.REDCAFE_PRIVADO = path.join(temporal, "privado");
const { borrarMiembro, datosDeMiembro, pedidosAbiertos, ANONIMO } = await import("../src/lib/borrado.js");
const { carpetaIdentidad } = await import("../src/lib/privado.js");
const { config } = await import("../src/lib/config.js");

const YO = "abc123", OTRO = "zzz999";
const subidas = () => path.join(config.uploads, "user-content");

function sembrar() {
  m.borradas = [];
  m.usuarios = {
    [YO]: { id: YO, email: "yo@ejemplo.test", nombre: "Ana", passHash: "$2b$x", cedulaCifrada: "cifrado:0102030405", cedulaHuella: "h", telefono: "099", whatsapp: "099", provincia: "Loja", extra: { bio: "x" } },
    [OTRO]: { id: OTRO, email: "otro@ejemplo.test", nombre: "Luis", extra: {} },
  };
  m.cols = {
    lotes: [{ id: "l1", productor_id: YO, foto: `/uploads/user-content/lote-${YO}-f1.jpg` }, { id: "l2", productor_id: OTRO }],
    posts: [{ id: "p1", autor_id: OTRO, comments: [{ autor_id: YO, autor: "Ana", texto: "hola" }, { autor_id: OTRO, autor: "Luis" }] }, { id: "p2", autor_id: YO }],
    empleos: [{ id: "e1", autor_id: YO }],
    postulaciones: [{ id: "po1", empleo_id: "e1", postulante_id: OTRO }, { id: "po2", empleo_id: "e9", postulante_id: YO }, { id: "po3", empleo_id: "e9", postulante_id: OTRO }],
    chats: [{ id: "c1", users: [YO, OTRO] }, { id: "c2", users: [OTRO, "x"] }],
    messages: [{ id: "m1", room: "c1", from: OTRO }, { id: "m2", room: "c2", from: OTRO }],
    ratings: [{ id: "r1", rated_id: YO, rater_id: OTRO }, { id: "r2", rated_id: OTRO, rater_id: YO }, { id: "r3", rated_id: OTRO, rater_id: "x" }],
    notificaciones: [{ id: "n1", uid: YO }, { id: "n2", uid: OTRO }],
    "push-suscripciones": [{ id: "ps1", uid: YO }],
    "verificacion-identidad": [{ id: "v1", uid: YO, archivos: { documento: "doc-a.pdf", selfie: "self-a.jpeg" } }, { id: "v2", uid: OTRO, archivos: { documento: "doc-b.pdf" } }],
    "contenido-subido": [{ id: "s1", uid: YO, url: `/uploads/user-content/comunidad-${YO}-s1.jpg` }],
    pedidos: [{ nro: 1, solicitante_id: YO, solicitante: "Ana", email: "yo@ejemplo.test", productor_id: OTRO, productor: "Luis", estado: "entregado" }],
    "inscripciones-cursos": { [`k1::${YO}`]: { usuario: YO }, [`k1::${OTRO}`]: { usuario: OTRO } },
    "progreso-cursos": { [YO]: { completadas: [] }, [OTRO]: { completadas: [] } },
    "notas-admin": { [`u:${YO}`]: "nota", [`u:${OTRO}`]: "otra" },
    "guias-registros": { [YO]: { riego: [] } },
    sanciones: [{ id: "sa1", uid: YO }],
  };
  fs.rmSync(temporal, { recursive: true, force: true });
  fs.mkdirSync(subidas(), { recursive: true });
  for (const n of [`lote-${YO}-f1.jpg`, `comunidad-${YO}-s1.jpg`, `curso-${YO}-0123456789ab.jpg`, `curso-x${YO}-0123456789ab.jpg`, `lote-${OTRO}-f2.jpg`]) fs.writeFileSync(path.join(subidas(), n), "x");
  const priv = carpetaIdentidad();
  for (const n of ["doc-a.pdf", "self-a.jpeg", "doc-b.pdf"]) fs.writeFileSync(path.join(priv, n), "x");
}

beforeEach(() => { sembrar(); vi.clearAllMocks(); });
afterAll(() => fs.rmSync(temporal, { recursive: true, force: true }));

describe("baja LOPDP: borrarMiembro", () => {
  it("borra todo lo del miembro y respeta los datos de los demás", async () => {
    const r = await borrarMiembro(YO);
    const ids = (c: string) => (m.cols[c] as any[]).map((x) => x.id);
    expect(ids("lotes")).toEqual(["l2"]);
    expect(ids("posts")).toEqual(["p1"]);
    expect(ids("empleos")).toEqual([]);
    expect(ids("postulaciones")).toEqual(["po3"]); // la suya y las de su oferta borrada
    expect(ids("chats")).toEqual(["c2"]);
    expect(ids("messages")).toEqual(["m2"]);
    expect(ids("ratings")).toEqual(["r3"]);
    expect(ids("notificaciones")).toEqual(["n2"]);
    expect(ids("push-suscripciones")).toEqual([]);
    expect(ids("verificacion-identidad")).toEqual(["v2"]);
    expect(ids("contenido-subido")).toEqual([]);
    expect(Object.keys(m.cols["inscripciones-cursos"])).toEqual([`k1::${OTRO}`]);
    expect(Object.keys(m.cols["progreso-cursos"])).toEqual([OTRO]);
    expect(Object.keys(m.cols["notas-admin"])).toEqual([`u:${OTRO}`]);
    expect(m.cols["guias-registros"][YO]).toBeUndefined();
    expect(r.archivos).toBe(5);
    expect(fs.readdirSync(subidas()).sort()).toEqual([`curso-x${YO}-0123456789ab.jpg`, `lote-${OTRO}-f2.jpg`]);
    expect(fs.readdirSync(carpetaIdentidad())).toEqual(["doc-b.pdf"]);
  });

  it("anonimiza comentarios y pedidos con terceros", async () => {
    await borrarMiembro(YO);
    const c = m.cols.posts[0].comments;
    expect(c[0]).toMatchObject({ autor: ANONIMO, autor_id: "" });
    expect(c[1]).toMatchObject({ autor: "Luis", autor_id: OTRO });
    const p = m.cols.pedidos[0];
    expect(p.solicitante).toBe(ANONIMO);
    expect(p.email).toBeUndefined();
    expect(p.productor).toBe("Luis");
  });

  it("deja la cuenta como lápida sin datos personales y cierra sesiones", async () => {
    await borrarMiembro(YO);
    const u = m.usuarios[YO];
    expect(u).toMatchObject({ nombre: ANONIMO, estado: "eliminado", activo: false, passHash: "", cedulaCifrada: "", cedulaHuella: "", telefono: "", whatsapp: "", provincia: "" });
    expect(u.email).toBe(`eliminado+${YO}@invalid`);
    expect(JSON.stringify(u)).not.toMatch(/Ana|yo@ejemplo\.test|0102030405|Loja/);
    for (const t of ["sesion", "codigoRespaldo", "otp", "recuperacionPass"]) expect(m.borradas).toContain(`${t}:${YO}`);
    expect(m.usuarios[OTRO].nombre).toBe("Luis");
  });

  it("es repetible sin errores", async () => {
    await borrarMiembro(YO);
    await expect(borrarMiembro(YO)).resolves.toBeTypeOf("object");
  });

  it("detecta pedidos abiertos", async () => {
    expect(await pedidosAbiertos(YO)).toEqual([]);
    m.cols.pedidos[0].estado = "Solicitado";
    expect((await pedidosAbiertos(YO)).length).toBe(1);
  });
});

describe("Descargar mis datos", () => {
  it("incluye perfil, cédula descifrada y sus colecciones, sin hash ni datos ajenos", async () => {
    const d = await datosDeMiembro(YO);
    expect(d.perfil).toMatchObject({ id: YO, email: "yo@ejemplo.test", cedula: "0102030405" });
    expect(d.perfil.passHash).toBeUndefined();
    expect(d.perfil.cedulaHuella).toBeUndefined();
    expect(d.lotes.map((x: any) => x.id)).toEqual(["l1"]);
    expect(d.chats.map((x: any) => x.id)).toEqual(["c1"]);
    expect(d.messages.map((x: any) => x.id)).toEqual(["m1"]);
    expect(d.ratings.map((x: any) => x.id)).toEqual(["r1", "r2"]);
    expect(d.pedidos.length).toBe(1);
    expect(d.sanciones.length).toBe(1);
    expect(d.matriculas).toEqual([{ usuario: YO }]);
    expect(d.guias_registros).toEqual({ riego: [] });
    expect(d["push-suscripciones"]).toBeUndefined();
  });
});
