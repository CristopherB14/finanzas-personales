# Klaro — Finanzas personales claras

**Klaro** es una aplicación web **offline-first** (PWA) para gestionar ingresos, gastos,
transferencias, inversiones y presupuesto personal. Pensada para personas comunes, no para
analistas financieros.

## Características

- Dashboard con patrimonio, ahorro, semáforo de estado y meses de fondo de emergencia.
- Registro de ingresos, gastos, transferencias e inversiones, con soporte ARS/USD.
- Gastos recurrentes con recordatorios en Google Calendar.
- Presupuesto por categoría/subcategoría (monto fijo o % del ingreso) con alertas visuales.
- Pagos de gastos vía Mercado Pago (Checkout Pro).
- Funciona sin conexión (IndexedDB + sincronización automática) e instalable como PWA.
- Autenticación con Supabase (email + contraseña).

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, Recharts.
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security).
- **Offline**: Dexie (IndexedDB) + Service Worker.
- **Integraciones**: Google Calendar API, Mercado Pago, cotización BNA/dolarapi.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full breakdown.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project (see docs/environment.md)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To set up the database, run every file in `supabase/migrations/` against your Supabase project, in
filename order (e.g. via the SQL Editor, or the Supabase CLI). See
[`docs/database.md`](docs/database.md) and [`docs/deploy.md`](docs/deploy.md).

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

There is no automated test suite yet — see [`docs/testing.md`](docs/testing.md).

## Documentation

This repo is documented for both humans and AI coding agents (see [`CLAUDE.md`](CLAUDE.md), the
entry point for Claude Code).

| Doc | Contents |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | AI agent entry point: conventions, constraints, workflow |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design, folder structure, sync flow |
| [`DECISIONS.md`](DECISIONS.md) / [`docs/adr/`](docs/adr/) | Why things are built the way they are |
| [`ROADMAP.md`](ROADMAP.md) | What's done, shipped beyond MVP, and not started |
| [`TODO.md`](TODO.md) | Actionable pending work |
| [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | Known gaps and sharp edges |
| [`CHANGELOG.md`](CHANGELOG.md) | Change history |
| [`docs/api.md`](docs/api.md) | API routes |
| [`docs/auth.md`](docs/auth.md) | Auth flow |
| [`docs/database.md`](docs/database.md) | Schema, RLS, relations |
| [`docs/environment.md`](docs/environment.md) | Environment variables |
| [`docs/deploy.md`](docs/deploy.md) | Deployment process |
| [`docs/testing.md`](docs/testing.md) | Testing strategy |
| [`docs/conventions.md`](docs/conventions.md) | Coding conventions |
| [`docs/domain.md`](docs/domain.md) | Business terminology & rules |
| [`docs/scripts.md`](docs/scripts.md) | npm scripts & migrations |

## Estructura

```
src/app/          → Rutas (landing, login/registro, dashboard, transacciones, presupuesto, ...)
src/components/   → UI, gráficos, layout, formularios
src/lib/          → Supabase, sync, cálculos financieros, DB local, pagos, Google Calendar
supabase/         → Migraciones SQL
docs/             → Documentación técnica
```

## Disclaimer

La app no ofrece asesoramiento financiero profesional ni recomendaciones de inversión.

## Licencia

Uso personal del proyecto. Ajustar según necesidad.
