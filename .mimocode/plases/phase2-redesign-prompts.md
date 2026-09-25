# Fase 2: Prompts de Rediseño Frontend

## Contexto Global para Todos los Agentes

### Sistema de Diseño "Nexus"

La plataforma está siendo transformada en **Nexus** — un SaaS premium de inteligencia revenue. El nuevo diseño usa:

**Paleta de colores:**
- Fondo principal: `#0f0f14` (negro profundo con tinte azul)
- Fondo cards: `rgba(255,255,255,0.03)` con backdrop-blur (glassmorphism)
- Acento principal: `#8b5cf6` (púrpura eléctrico)
- Acento secundario: `#06b6d4` (cyan glow)
- Success: `#22c55e`, Warning: `#f59e0b`, Danger: `#ef4444`
- Texto principal: `#f8fafc`, Texto secundario: `#94a3b8`

**Efectos visuales:**
- `.glass` y `.glass-card` — cards con backdrop-blur y bordes luminosos
- `.glow-purple`, `.glow-cyan` — efectos de resplandor
- `.gradient-primary` — gradiente púrpura a cyan
- Animaciones: fadeIn, slideUp, scaleIn, shimmer, pulse-glow

**Tipografía:**
- Headings: font-weight 700-800, tracking-tight
- Body: font-weight 400-500
- Números/métricas: font-mono, text-2xl/text-3xl

**Componentes base (ya creados en frontend/src/components/ui/):**
- `<Card>`, `<CardHeader>`, `<CardContent>`, `<CardTitle>` — con variantes glass/gradient/glow
- `<Button>` — variantes: primary (gradiente), ghost, glow, destructive
- `<Badge>` — variantes: success, warning, info, danger, premium
- `<Skeleton>` — loading shimmer animado
- `cn()` utilidad para clases tailwind

**Patrones:**
- Dark mode por defecto (sin toggle por ahora)
- Loading states con Skeleton, no spinners inline
- Empty states con iconos y CTAs accionables
- Micro-interacciones: hover:scale, active:scale-[0.98], transiciones suaves
- Feedback toast con sonner/hot-toast para acciones

### Reglas TypeScript
- CERO `any` — usar tipos discriminados para errores
- Usar tipos de `frontend/src/lib/types/index.ts`
- Props con interfaces tipadas
- Genéricos donde corresponda

### API Client
- Usar `api` de `@/lib/api-client`
- Manejar errores con try/catch tipado
- Mostrar errores al usuario via toast

### Layout
- El sidebar ya existe y será rediseñado por otro agente
- Cada página debe ser responsive (mobile-first)
- Usar el componente <Card> para secciones

---

## Prompt Template para Agente de Página

```
Trabaja en /mnt/e/Projects/AI-Lead-Intelligence-Platform/frontend.

Tu tarea es rediseñar completamente la página [RUTA] con el sistema de diseño premium "Nexus".

Archivo a modificar: [PATH]

Requisitos visuales:
- Usar componentes del design system: <Card>, <Button>, <Badge>
- Aplicar glassmorphism en cards principales
- Métricas con números grandes (font-mono, text-3xl) y cambios sutiles de color
- Iconos de Lucide React con contenedores de color/accento
- Animaciones de entrada (fadeIn, slideUp) donde aporte valor
- Hover states con escala sutil y glow
- Empty states con ilustración/icono y CTA accionable
- Loading con <Skeleton>, no spinners inline

Requisitos funcionales:
- Manejo de errores con try/catch tipado (NO `any`)
- Mostrar errores via toast/sonner
- Estados de carga, vacío, error, éxito
- Responsive (mobile, tablet, desktop)
- Accesibilidad: aria labels, keyboard navigation, contraste

Datos:
- Usar api client de @/lib/api-client
- Tipos de @/lib/types
- Endpoint(s): [ENDPOINTS]

Layout específico: [DESCRIPCIÓN DE LA PÁGINA]

Importante:
- No modifiques otros archivos fuera de tu scope
- Usa cn() para composición de clases
- Sigue los patrones de las páginas ya rediseñadas
- Código limpio, tipado, sin `any`
```

---

## Asignación de Agentes por Página

### Lote A (Layout + Dashboard — máxima prioridad)
1. **layout.tsx** — Sidebar glassmorphism con acentos, tooltips, animaciones de colapso
2. **page.tsx (Dashboard)** — KPIs animados, gráficos Recharts, pipeline visual

### Lote B (Páginas de datos)
3. **companies/page.tsx** — Tabla premium con sorting, búsqueda, paginación
4. **companies/[id]/page.tsx** — Detail view con tabs, timeline, acciones
5. **discovery/page.tsx** — Búsqueda AI + mapa integrado + resultados

### Lote C (Páginas de acción)
6. **deals/page.tsx** — Kanban con drag-and-drop, cards de deals
7. **campaigns/page.tsx** — Lista de campañas + modal crear + stats
8. **conversations/page.tsx** — Chat en tiempo real, lista de conversaciones

### Lote D (Páginas analytics + config)
9. **analytics/page.tsx** — Dashboard con gráficos Recharts (líneas, barras, áreas)
10. **scoring/page.tsx** — Sliders con feedback visual, peso total
11. **deliverability/page.tsx** — Status de inboxes, warmup progress
12. **scrapers/page.tsx** — Grid de scrapers con status, último run
13. **settings/page.tsx** — Formularios premium, secciones claras
