# Roadmap de desarrollo

## MVP (8–10 semanas) — **En implementación**

Objetivo: reemplazar la planilla Excel básica para ingresos, gastos y vista mensual.

| # | Entrega | Criterio de éxito |
|---|---------|-------------------|
| M1 | Auth + perfil | Registro/login, perfil con moneda |
| M2 | Cuentas y categorías | CRUD + seeds por defecto |
| M3 | Transacciones | Ingreso/gasto < 10 s, historial, filtros |
| M4 | Dashboard | KPIs mes, semáforo, gráfico 6 meses |
| M5 | Presupuesto | Límites por categoría + alertas 80/100% |
| M6 | Offline + sync | IndexedDB, cola, merge, PWA instalable |
| M7 | Export CSV | Descarga de movimientos |

**Fuera del MVP**: inversiones detalladas, IA, proyecciones, deudas avanzadas, import Excel.

## v1.0 (12–16 semanas post-MVP)

- Fondo de emergencia (cálculo automático de meses).
- Deudas (tarjetas, préstamos, estrategia bola de nieve/avalancha).
- Patrimonio (activos/pasivos manuales).
- Objetivos financieros con barras de progreso.
- Import/export Excel.
- Export PDF de reportes mensuales.

## v1.5

- Inversiones (posiciones, rendimiento simplificado, distribución).
- Análisis automático (reglas + primeras integraciones IA).
- Proyecciones (1/5/10 años, 3 escenarios).
- Multi-moneda básica.

## v2.0

- Asistente IA conversacional (guardrails legales).
- Categorización automática (ML/heurísticas).
- Hogar compartido (familia).
- Integraciones bancarias (donde regulación lo permita).
- Cifrado E2E opcional para datos sensibles.

## Métricas de producto

- Tiempo medio registro gasto < 10 s.
- DAU/WAU, retención D7/D30.
- % sesiones offline exitosas.
- NPS tras 30 días de uso.

## Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Complejidad sync | MVP con LWW + client_id; conflictos UI en v1 |
| Scope creep | Roadmap estricto; módulos tras MVP |
| IA compliance | Disclaimers; sin tickers ni "comprá X" |
| Safari PWA limits | Documentar; fallback web estándar |
