# Diseño UX/UI

## Personalidad visual

- **Estilo**: app bancaria moderna, limpia, confiable.
- **Paleta**: fondo claro/oscuro; acento verde (positivo), ámbar (alerta), rojo (riesgo).
- **Tipografía**: sistema sans (Geist en Next.js); números tabulares para montos.
- **Espaciado**: generoso; máximo 3 métricas hero por pantalla.

## Wireframes (descripción)

### 1. Dashboard (home)

```
┌─────────────────────────────────────┐
│ Hola, María          🔔  ⚙️         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Patrimonio neto    $ 2.450.000  │ │
│ │ ▲ +8% este año                  │ │
│ └─────────────────────────────────┘ │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │Ingres│ │Gastos│ │Ahorro│         │
│ │ $800k│ │ $620k│ │ $180k│         │
│ └──────┘ └──────┘ └──────┘         │
│ Estado: 🟢 Vas bien este mes        │
│ ┌─ Fondo emergencia ─────────────┐ │
│ │ ████████░░ 5.2 meses           │ │
│ └─────────────────────────────────┘ │
│ [Gráfico evolución 6 meses]         │
│ Alertas: Gastaste 90% en Comidas    │
│ [+ Registrar gasto]  (FAB móvil)    │
└─────────────────────────────────────┘
```

### 2. Registrar gasto (< 10 s)

```
┌─────────────────────────────────────┐
│ ← Nuevo gasto                       │
│ Monto: [ $ ________ ]               │
│ Categoría: [ Comida ▼ ]  (chips)    │
│ Cuenta: [ Banco Nación ▼ ]          │
│ Fecha: [ Hoy ]                      │
│ Nota opcional: ___________          │
│ [ Guardar ]                         │
└─────────────────────────────────────┘
```

Flujo: monto → categoría sugerida (última usada) → guardar. Un solo paso visible; detalles colapsables.

### 3. Navegación

**Desktop**: sidebar fija (Dashboard, Movimientos, Presupuesto, Patrimonio, Más).

**Móvil**: bottom bar (Inicio, Gastos, +, Presupuesto, Perfil).

## Componentes UI

| Componente | Uso |
|------------|-----|
| `MetricCard` | KPI con variación y color semáforo |
| `TrafficLight` | 🟢🟡🔴 según umbrales |
| `ProgressBar` | Objetivos, presupuesto, emergencia |
| `SimpleLineChart` | Evolución patrimonio/ahorro |
| `CategoryChip` | Selección rápida |
| `InsightCard` | Mensaje IA en lenguaje natural |
| `EmptyState` | Primera vez sin datos |

## Semáforos (umbrales ejemplo)

| Indicador | Verde | Amarillo | Rojo |
|-----------|-------|----------|------|
| Tasa de ahorro | ≥ 20% | 10–19% | < 10% |
| Presupuesto usado | < 80% | 80–100% | > 100% |
| Fondo emergencia | ≥ 6 meses | 3–5 | < 3 |

## Accesibilidad

- Contraste WCAG AA.
- Labels en todos los inputs.
- Gráficos con tabla alternativa.
- Soporte teclado en modales y FAB.

## Copy (lenguaje simple)

| Técnico | Usuario |
|---------|---------|
| CAGR | "Creció ~12% por año en promedio" |
| Volatilidad | "Riesgo moderado" |
| Liquidez | "Dinero disponible rápido" |
| Pasivo | "Lo que debés" |

## PWA

- `manifest.json`: nombre, iconos 192/512, `display: standalone`, theme color.
- Instalable en iOS (Add to Home), Android, escritorio Chrome/Edge.
- Splash y offline fallback page.

## Modo offline

- Banner discreto: "Sin conexión — tus cambios se guardan en el dispositivo".
- Icono de sync cuando vuelve la red.
- Sin bloquear acciones principales.
