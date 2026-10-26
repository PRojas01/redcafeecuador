# Backlog Técnico — Fase 1 Productiva (E1.1)

**Propósito:** dejar listo, en el repo, el mapa de construcción del MVP productivo para que el día que se apruebe el gate de Fase 0 (criterios de salida de `GUIA_ACCIONES_MANUALES.md` guías 1 y 3) se pueda arrancar de inmediato.

**Versión:** 1.0 · **Fecha:** 13 de agosto de 2026
**Estado:** 🌱 Preparado (no implementado — espera gate de Fase 0)

> **Gate:** no se implementa hasta cumplir E0.1 (entrevistas → informe) y E0.6 (3 cartas de intención). Después se migra desde el prototipo demo (`app/`, `lib/data.ts`, localStorage).

---

## 1. Stack objetivo (según PLAN §7)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (ya en el repo) + Tailwind (ya en el repo) |
| Backend | Node.js — vía **API routes / Route Handlers de Next.js** (sin servidor extra) o NestJS si el equipo lo prefiere |
| Base de datos | PostgreSQL (Neon/Supabase para PaaS o VPS) |
| ORM | Prisma |
| Auth | NextAuth / Auth.js con roles (productor, vendedor, comprador, admin) |
| Archivos/imágenes | S3 (o Supabase Storage) |
| Pagos/escrow | Payphone/Banred (Ecuador) + cuenta en custodia; PayPal intl |
| Facturación | Proveedor local (Datafast) que automatiza el SRI |
| WhatsApp | WhatsApp Business API (oficial) |
| Video | Cloudflare Stream / YouTube privado |
| Monitoreo | Sentry |

## 2. Modelo de datos (borrador Prisma)

> Normaliza lo que hoy vive en `lib/data.ts` (Lote, Curso, Plan) y en `localStorage` (sesión, pedidos, progreso, certificados, waitlist, feedback).

```prisma
enum Rol {
  productor
  vendedor
  comprador
  admin
}

model Usuario {
  id            String   @id @default(cuid())
  nombre        String
  email         String   @unique
  telefono      String   @unique
  rol           Rol
  provincia     String?
  planId        String?
  plan          Plan?    @relation(fields: [planId], references: [id])
  verificacion  String?               // documental en Fase 2
  fechaRegistro DateTime @default(now())
  finca         Finca?
  lotes         Lote[]
  pedidos       Pedido[]
  progresoCursos CursoUsuario[]
  certificados  Certificado[]
}

model Finca {
  id        String  @id @default(cuid())
  productorId String @unique
  productor Usuario @relation(fields: [productorId], references: [id])
  nombre    String
  gps       String   // "lat,lng"
  altitud   Float
  superficie Float
  variedad  String?
  proceso   String?
  fotos     String[] // URLs S3
}

model Lote {
  id            String @id @default(cuid())
  productorId   String
  productor     Usuario @relation(fields: [productorId], references: [id])
  provincia     String
  variedad      String
  proceso       String
  altura        Float
  score         Int
  precioQuintal Float
  stockQuintales Float
  certificacion String?
  trazabilidad  String? // JSON: gps, metodos
  estado        String @default("publicado") // publicado/solicitado/en_escrow/repartido/entregado
  creadoEn      DateTime @default(now())
  pedidos       Pedido[]
}

model Plan {
  id          String @id @default(cuid())
  nombre      String
  perfil      Rol
  precio      Float
  beneficios  String[]
  destacado   Boolean?
}

model Pedido {  // soporta escrow
  id          String @id @default(cuid())
  loteId      String
  compradorId String
  cantidad    Float
  totalUsd    Float
  estado      String // solicitud/escrow/conforme/revertido/liberado
  fecha       DateTime @default(now())
  evidencia   String? // JSON con URLs de guías/fotos para disputas
  disputa     Disputa?
}

model Disputa {
  id      String @id @default(cuid())
  pedidoId String @unique
  estado  String // abierta/evaluando/resuelta
  resolucion String?
}

model Curso {
  id      String @id @default(cuid())
  titulo  String
  nivel   String
  categoria String
  modulos Json    // [{titulo, minutos, videoUrl?}]
}

model CursoUsuario {
  usuarioId String
  cursoId   String
  progreso  Int     @default(0) // módulos completados
  @@id([usuarioId, cursoId])
}

model Certificado {
  id         String @id @default(cuid())
  usuarioId  String
  cursoId    String
  emitidoEn  DateTime @default(now())
  codigo     String @unique  // validación pública
}

model Waitlist {
  id       String @id @default(cuid())
  nombre   String
  email    String @unique
  perfil   Rol?
  telefono String?
  fecha    DateTime @default(now())
}
```

**Reglas de negocio a implementar en el backend:**
- Escrow: `Pedido.estado` solo pasa a `liberado` si el productor confirma conformidad (o tras periodo de no-disputa). Guía en `docs/MANUAL_SOPORTE.md` §3.
- Un usuario solo ve/opera acciones según `rol` (middleware de rutas).
- Validación de datos: zodiac/email RFC en el form; números no negativos en lotes/precios.

## 3. API (Route Handlers) — endpoints del MVP

| Método & ruta | Función | Prototipo equivalente |
|---|---|---|
| `POST /api/auth/register` · `/api/auth/login` | Autenticación + roles | `/afiliate` + `lib/sesion.ts` |
| `GET /api/lotes` `?provincia=&variedad=&proceso=&q=` | Escaparate + filtros | `/marketplace` + `lib/data.ts` |
| `POST /api/lotes` | Publicar lote (productor) | — (demo no escribe) |
| `GET /api/lotes/[id]` | Detalle de lote | `/marketplace/[id]` |
| `POST /api/pedidos` | Solicitar compra | Pedido demo en detalle |
| `POST /api/pedidos/[id]/confirmar-conformidad` | Liberar escrow | Modal escrow demo |
| `POST /api/pedidos/[id]/disputa` | Abrir disputa + evidencia | — |
| `GET/PUT /api/cursos/[id]/progreso` | Progreso de curso | Academia + localStorage |
| `GET /api/mi-certificado` + `GET /api/certificados/[codigo]` | Certificados (validación pública) | Academia certificado demo |
| `POST /api/waitlist` | Guardar sign-up de la landing | Waitlist landing (localStorage) |
| `POST /api/feedback` | Guardar feedback de laboratorio | FeedbackForm (localStorage) |

**Respuesta estándar:** JSON `{ data }` o `{ error, code }`. Validar con Zod. Documentar en `docs/openapi.yaml` (pendiente de escribir junto a la implementación).

## 4. Plan de sprints productivos (2 semanas c/u — 6 meses)

| Sprint | Contenido | Criterio de salida |
|---|---|---|
| S1 | Repo, CI, staging, BD + Prisma + semilla de datos reales del piloto | `migrate` aplicado + semilla corre |
| S2 | **Auth y roles** + registro de finca con GPS | Login de los 3 roles + finca creada |
| S3 | **CRUD de lotes** + escaparate con filtros | Productor publica lote con foto+GPS |
| S4 | **Pedido + chat WhatsApp (Business API)** | Comprador solicita, negocian por WhatsApp |
| S5 | **Pagos + escrow** (Payphone sandbox) | Pago retenido, confirmación libera |
| S6 | **Academia**: 10 cursos + progreso + certificado | Certificado emitido con código público |
| S7 | **Facturación SRI** (Datafast) | Factura electrónica emitida desde la app |
| S8 | Fixed posts + pruebas E2E + hardening | Checklist de regresión pasa |
| S9 | **Onboarding masivo** del piloto (promotores) + dashboard admin | 100 productores + 20 compradores dados de alta |
| S10 | Estabilización, monitoreo, 2 ciclos de venta completos | Reporte de métricas base (E1.6) |

**Flujo crítico (happy path) a validar en cada demo de sprint:** *Productor publica → Tostador solicita → Negocian por WhatsApp → Compra con escrow → Despacho → Liberación → Factura → Curso.*

## 5. Migración desde el prototipo demo

1. `lib/data.ts` → semillas Prisma (conservar IDs, transferir Lote/Curso/Plan).
2. `localStorage` (sesión/pedidos/progreso/certificados) → tablas correspondientes.
3. Esperar a que la demo no toque BD: hacer la migración en rama paralela y congelar cambios demo en la fase de copy-servidor.
4. Verificar en staging con un dump anonimizado antes de ir a producción.

## 6. Estructura de archivos propuesta

```
prisma/schema.prisma        # modelo de datos (§2)
src/app/api/**/route.ts      # API (§3)     [o app/api/**]
src/lib/auth.ts              # roles y sesión
src/lib/db.ts                # cliente Prisma
src/lib/validators.ts        # Zod
seed.ts                      # semilla desde lib/data.ts
docs/openapi.yaml            # documentación API
docs/ADR-*.md                # decisiones registradas
```