# Mis Finanzas — Finanzas Personales Integral

Aplicación web **offline-first** para gestionar ingresos, gastos, presupuesto y situación financiera personal. Pensada para personas comunes, no para analistas financieros.

## Características (MVP)

- Dashboard con patrimonio, ahorro, semáforo y fondo de emergencia
- Registro rápido de ingresos y gastos
- Presupuesto por categoría con alertas
- Funciona sin internet (IndexedDB + sincronización)
- PWA instalable (Android, iOS, escritorio)
- Autenticación con Supabase

## Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind, shadcn-style UI, Recharts
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Offline**: Dexie (IndexedDB), Service Worker

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura y sync |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de datos |
| [docs/UX-DESIGN.md](docs/UX-DESIGN.md) | Wireframes y UI |
| [docs/USER-FLOWS.md](docs/USER-FLOWS.md) | Flujos de usuario |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Roadmap MVP → v2 |
| [docs/MVP.md](docs/MVP.md) | Alcance MVP |

## Inicio rápido

```bash
# Crear .env.local con las variables requeridas (ver docs/ARCHITECTURE.md):
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
# GOOGLE_REDIRECT_URI (localhost en local; dominio de producción en .env)

# En Supabase SQL Editor, ejecutar:
# supabase/migrations/20250602000000_initial_schema.sql

npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura

```
src/app/          → Rutas (landing, auth, dashboard, gastos, ingresos, presupuesto)
src/components/   → UI, gráficos, layout
src/lib/          → Supabase, sync, cálculos financieros, DB local
supabase/         → Migraciones SQL
docs/             → Diseño y arquitectura
```

## Roadmap

Ver [docs/ROADMAP.md](docs/ROADMAP.md) para v1.0 (deudas, patrimonio, Excel), v1.5 (inversiones, IA) y v2.0 (asistente completo, hogar compartido).

## Disclaimer IA (futuro)

El asistente financiero es **educativo**. No constituye asesoramiento profesional ni recomendaciones de inversión específicas.

## Licencia

Uso personal del proyecto. Ajustar según necesidad.
