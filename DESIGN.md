# Design Brief — GlobeFlow + Hyperlocal Heat-Risk Tool

## Direction

GlobeFlow dark space theme extended with a perceptually-ordered heat-risk severity scale for civic resource allocation.

## Tone

Restrained meteorological-civic — the globe stays the hero; risk overlays and glass panels add precision without spectacle.

## Differentiation

A 4-level risk scale whose OKLCH lightness+chroma rise monotonically with severity, so risk reads without legend lookup.

## Color Palette

| Token           | OKLCH        | Role                                |
| --------------- | ------------ | ----------------------------------- |
| background      | 0.08 0.012 250 | Deep space navy (existing)        |
| foreground      | 0.92 0.01 240 | Primary text (existing)           |
| card            | 0.13 0.018 250 | Glass panel base (existing)      |
| primary         | 0.55 0.18 240 | Tool active state (existing)      |
| risk-low        | 0.72 0.17 150 | ต่ำ — green, vegetated/cool       |
| risk-medium     | 0.82 0.16 90  | ปานกลาง — yellow                  |
| risk-high       | 0.70 0.17 55  | สูง — orange                       |
| risk-critical   | 0.52 0.21 27  | วิกฤต — deep red, pulsing         |
| heat-stop 0–3   | matches risk-low→critical | Heatmap gradient stops |

## Typography

- Display/Body: Plus Jakarta Sans (existing, renders Thai cleanly)
- Scale: panel title text-base font-semibold, score text-3xl font-bold, Thai labels text-sm, factor rows text-xs

## Elevation & Depth

Existing `.glass-panel` glassmorphism (blur 12px, 0.85 alpha) extended; risk panels inherit it; critical zones get `heat-pulse` glow ring.

## Structural Zones

| Zone                  | Background          | Border              | Notes                              |
| --------------------- | ------------------- | ------------------- | ---------------------------------- |
| Layer toolbar (left)  | glass-panel         | existing            | New heat-risk icon + พยากรณ์ความเสี่ยง chip |
| Globe viewport        | star-bg             | —                   | Heatmap texture overlay on globe   |
| Risk control panel (right-top)  | glass-panel | rgba(43,52,67,0.8) | Score gauge, level badge, 3 factor sliders |
| Risk report panel (right-bottom) | glass-panel | rgba(43,52,67,0.8) | Legend, resource recommendation cards |

## Spacing & Rhythm

Right panel stack 12px gaps; factor rows 8px; recommendation cards 12px internal padding, 10px gap between cards.

## Component Patterns

- Risk badge: rounded-full px-2.5 py-0.5, bg risk-{level}, text risk-{level}-foreground
- Score gauge: radial 0–100, ring colored by current risk level
- Factor slider: muted track, risk-level thumb when active
- Heatmap legend: .heat-gradient bar, 4 Thai labels beneath
- Recommendation card: glass-panel, icon + Thai title + one-line action

## Motion

- Entrance: slide-in-right (existing) for panels
- Hover: card lift + border lighten, 0.2s ease
- Decorative: heat-pulse on critical zones only (2.4s, cubic-bezier)

## Constraints

- Thai labels throughout (ต่ำ/ปานกลาง/สูง/วิกฤต and factor names)
- Reuse existing temperature + vegetation layers as risk inputs (no real-time HTTP)
- No multi-area compare, no PDF export, no 24–72h forecast (doNotBuild)
- Single-view globe app, no router

## Signature Detail

The critical-level deep-red `heat-pulse` ring — the only animated color on the otherwise calm globe — makes the worst zones impossible to miss during agency briefings.
