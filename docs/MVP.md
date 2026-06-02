# MVP — Alcance y estado

## Incluido en esta entrega

| Módulo | Funcionalidad |
|--------|----------------|
| Auth | Registro, login, sesión Supabase |
| Dashboard | Patrimonio estimado, ingresos/gastos/ahorro, semáforo, emergencia, gráfico 6 meses |
| Ingresos | Listado + registro rápido con categorías |
| Gastos | Listado + registro rápido (< 10 s objetivo UX) |
| Presupuesto | Límites por categoría vs gasto real + alertas visuales |
| Offline | IndexedDB (Dexie), cola sync, banner sin conexión |
| PWA | manifest.json + Service Worker básico |
| DB | Migración SQL completa con RLS |

## Pendiente post-MVP

- Deudas, inversiones, patrimonio detallado, objetivos
- Proyecciones y escenarios
- Asistente IA
- Import/export Excel y PDF
- UI de resolución de conflictos de sync
- Cifrado E2E opcional

## Cómo probar

1. Crear proyecto en [Supabase](https://supabase.com).
2. Ejecutar `supabase/migrations/20250602000000_initial_schema.sql` en el SQL Editor.
3. Copiar `.env.example` → `.env.local` con URL y anon key.
4. `npm run dev` → http://localhost:3000

## KPIs MVP

- Registro de gasto en ≤ 3 taps tras abrir formulario.
- Dashboard renderiza métricas con datos locales sin red.
- Sync automático al evento `online`.
