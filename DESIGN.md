# DESIGN.md

A modern, minimalist approach to system user interfaces. This document outlines the core principles, visual language, and interactive patterns designed to create highly functional, aesthetically restrained, and lightweight desktop/web environments.

---

## 1. Design Philosophy

Modern minimalist systems UI is not just about removing elements; it is about **increasing the clarity of what remains**. It prioritizes content, reduces cognitive load, and respects the user’s focus.

*   **Subtraction as Addition:** If an element does not serve a direct informational or navigational purpose, it is omitted.
*   **Immediacy:** Content is the interface. Chrome, borders, and heavy containers are minimized so that the data itself shapes the layout.
*   **Typographic Hierarchy:** Bold scale contrasts replace heavy borders and backgrounds as primary structural separators.
*   **Deliberate Motion:** Animation is utilized purely as spatial communication (e.g., demonstrating where a window collapsed or how a menu emerged), never as ornamentation.

---

## 2. Visual Language & Variables

A cohesive, modern system UI is built upon a highly structured, scalable design token foundation.

### A. The Monochromatic Accent Palette
Minimalism thrives on high contrast but low color fatigue. We utilize a single-accent neutral system.

| Token | Light Mode | Dark Mode | Usage / Role |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | `#F6F7F9` | `#0B0D10` | Screen canvas, deep desktop background |
| `--bg-secondary`| `#FFFFFF` | `#12151A` | Active surface and system panels |
| `--bg-elevated` | `#FFFFFF` | `#171A20` | Dialogs, menus, and floating surfaces |
| `--bg-hover` | `#F0F2F5` | `#1D2128` | Interactive states and list-item hovering |
| `--fg-primary` | `#101114` | `#F3F5F7` | Primary text, titles, high-emphasis icons |
| `--fg-muted` | `#686D76` | `#9AA1AB` | Supporting labels, descriptions, metadata |
| `--border` | `#DDE0E5` | `#292E36` | Ultra-thin dividers and structural definition |
| `--accent` | `#0969DA` | `#58A6FF` | Intentional focus, active states, key CTAs |
| `--accent-soft` | `#EAF3FF` | `rgba(56,139,253,.14)` | Selected items and quiet accent surfaces |

### B. Spatial Grid & Layout scale
A strict 8px / 4px incremental grid ensures alignment harmony across varying viewport scales.
*   **Base Unit:** `8px` (`0.5rem`)
*   **Border Radius:** `6px` for small interactive components (buttons, inputs), `12px` for surface containers (cards, modals). Keep corner shapes sharp but slightly softened.
*   **Border Width:** Consistent `1px` or `1.5px` solid outlines. Heavy borders or double strokes are strictly prohibited.

---

## 3. Core Structural Patterns

### A. Flat Surface Architecture
Traditional design relies on multi-layered shadows to establish hierarchy. The modern minimalist approach uses **tonal elevation** instead of heavy box-shadows.

```
┌───────────────────────────────────────────────┐  <-- `--bg-primary` (Desktop Canvas)
│  ┌─────────────────────────────────────────┐  │
│  │                                         │  │  <-- `--bg-secondary` (App Surface)
│  │  ┌───────────────┐   ┌───────────────┐  │  │
│  │  │  Active Item  │   │  Muted Label  │  │  │  <-- `--border` (1px clean separation)
│  │  └───────────────┘   └───────────────┘  │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

*   **Shadows:** Limit shadows to a single, highly diffused environmental ambient glow for floating elements only (e.g., `box-shadow: 0 4px 30px rgba(0,0,0,0.03);`). Avoid hard outlines or multi-tiered drop-shadow offsets.

### B. Micro-Chromed Windows
Maximize the viewport canvas by eliminating traditional multi-row window headers. 

1.  **Unified Titlebar:** Merge the titlebar with the application global navigation bar.
2.  **Compact Window Controls:** Utilize simple, non-colored wireframe icons for close, minimize, and expand actions. They only reveal color or high-contrast states upon proximity hover.
3.  **No Status Bars:** Push non-critical background processes or status strings into an overlay HUD (Heads-Up Display) that fades out when idle.

---

## 4. Typography Rules

Minimalism depends on typography to convey structure. When you take away borders, size and font weight do the heavy lifting.

*   **Primary System Font:** Plus Jakarta Sans, bundled locally for reliable offline use, with the system sans-serif stack as fallback.
*   **Code/Data Font:** SF Mono, JetBrains Mono, or Fira Code. Used for precise spatial alignment in tables, terminals, or status readouts.

```
H1 (Large Titles)      ───  24–60px ─  SemiBold (600)  ───  tracking -0.02em to -0.045em
H2 (Sections)          ───  16px  ───  Medium (500)    ───  tracking -0.01em
Body (Regular)         ───  13px  ───  Regular (400)   ───  tracking  0
Caption / Metadata     ───  11px  ───  Regular (400)   ───  tracking +0.01em
```

---

## 5. UI Elements & Interaction States

To keep the system intuitive without visual clutter, rely heavily on precise micro-transitions for user feedback:

### Interactive States Reference
*   **Default State:** `--fg-muted` text, border `--border`, no background fill.
*   **Hover State:** Background shifts to `--bg-hover`. Cursor transitions to `pointer`.
*   **Active/Focused State:** Border transitions to `--accent` (or a `2px` subtle outline offset of `--accent`).
*   **Disabled State:** Opacity reduced globally to `40%`. Interactivity disabled.

### Form Fields & Inputs
Keep form fields completely borderless on three sides, or use a clean 1px border. 
*   **Minimalist Input:** An input with only a bottom-border `1px solid --border` that expands outward to `--accent` when focused is often cleaner than a fully enclosed box.
*   **Validation:** Use semantic colors (`#EF4444` for error, `#10B981` for success) sparingly. Rather than coloring the entire input container, use a single 4px indicator dot or clean text caption beneath the field.

---

## 6. Implementation Example (CSS Utility Class Blueprint)

Here is a quick-reference implementation CSS stylesheet blueprint for enforcing this modern minimalist UI framework:

```css
/* Core System Variables */
:root {
  --bg-primary: #f6f7f9;
  --bg-secondary: #ffffff;
  --bg-hover: #f4f4f5;
  --fg-primary: #101114;
  --fg-muted: #686d76;
  --border: #dde0e5;
  --accent: #0969da;
  
  --radius-sm: 6px;
  --radius-md: 12px;
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
}

/* Dark Mode Override */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #09090b;
    --bg-secondary: #121212;
    --bg-hover: #1c1c1e;
    --fg-primary: #f4f4f5;
    --fg-muted: #a1a1aa;
    --border: #27272a;
    --accent: #3b82f6;
  }
}

/* Base Body Application */
body {
  background-color: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  margin: 0;
  padding: 24px;
  -webkit-font-smoothing: antialiased;
}

/* Minimal Card Surface */
.system-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.system-card:hover {
  border-color: var(--fg-muted);
}

/* Interactive Component Action */
.system-button {
  background: var(--fg-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.1s ease;
}

.system-button:hover {
  opacity: 0.9;
}
```

---

## 7. Zia-PDF Component System

The product uses the same visual grammar on web, PWA, and Android. Platform layouts may change position or density, but not color meaning, type hierarchy, component geometry, or workflow order.

### Application Shell

* **Web:** A single 64px title/navigation bar contains brand, current tool selector, About, theme, and activity. Tool content begins immediately below it.
* **Android:** A compact safe-area header and bottom navigation provide Home, Tools, Open, Activity, and Settings. The primary Open action is prominent but never ornamental.
* **Drawers and Menus:** Use `--bg-elevated`, a 1px border, 12px radius, and only the ambient shadow token. Active rows use `--accent-soft` plus `--accent` text.

### Core Primitives

| Component | Required anatomy |
| :--- | :--- |
| Primary button | 44px minimum height, 6px radius, accent fill, 13px/600 label |
| Secondary button | 44px minimum height, surface fill, 1px border, primary text |
| Icon button | 40–44px square, 6px radius, visible accessible label |
| Field | Persistent label, 1px border, 6px radius, accent focus ring, inline help/error |
| Surface | Secondary background, 1px border, 12px radius, no default shadow |
| Drop zone | 1px dashed border, clear file-type instruction, keyboard-operable control |
| Dialog / sheet | Elevated surface, 12px radius on floating edges, focus containment and restoration |
| Progress | Text status plus visual progress; never communicate progress by animation alone |
| Status badge | Neutral by default; green, amber, and red are reserved for semantic status only |

### PDF Workflow

Every PDF tool follows one predictable sequence:

1. **Select** — choose or drop supported local files.
2. **Inspect** — show the selected file, size, page count, and encrypted state.
3. **Configure** — expose only options relevant to the current operation.
4. **Process** — lock duplicate actions and show meaningful local progress.
5. **Complete** — confirm success, then offer preview, share, download, and a new session.

Shared workflow chrome lives in `src/components/tools/shared`. Tool-specific PDF logic stays inside each tool component.

### Tool Library

Tool cards use one blue interaction accent regardless of category. Category remains textual metadata for scanning and filtering; it is not represented by a rainbow palette. Cards are flat modules with a 12px radius, 1px border, compact icon container, and directional affordance.

---

## 8. Responsive and Accessibility Contract

* Use a 44px minimum touch target on Android and touch-capable layouts.
* Keep visible `:focus-visible` outlines on every interactive control.
* Dialogs must expose `role="dialog"`, `aria-modal="true"`, an accessible title, Escape dismissal where safe, and focus restoration.
* Progress and result changes use polite live regions. Errors are placed beside the relevant control.
* At 200% zoom, core tasks must remain usable without horizontal page scrolling.
* Long filenames truncate visually but retain an accessible full name.
* Light and dark themes must maintain WCAG AA contrast for body text and controls.
* `prefers-reduced-motion` reduces all non-essential transitions and disables spatial animation.
* Motion durations are 100–180ms for controls and no more than 300ms for spatial overlays.

---

## 9. Implementation Map

| System responsibility | Source |
| :--- | :--- |
| Semantic tokens, theme, focus, reduced motion | `src/index.css` |
| Tailwind semantic utilities | `tailwind.config.js` |
| Global web/native shell, menus, history | `src/components/Layout.tsx` |
| Web workspace and tool library | `src/components/WebView.tsx` |
| Android home, tool library, activity | `src/components/AndroidView.tsx`, `AndroidToolsView.tsx`, `AndroidHistoryView.tsx` |
| Tool header, content frame, actions, privacy, completion | `src/components/tools/shared/` |
| Global preview and quick tool selection | `src/components/PdfPreview.tsx`, `src/App.tsx` |

No design element may add remote fonts, analytics, telemetry, or network-backed assets. Visual enhancements must preserve Zia-PDF's offline and local-processing guarantees.

---

## 10. Best Practices Checklist
- [ ] **Are borders necessary?** Can spacing, layout, or color differences separate elements instead?
- [ ] **Are there too many colors?** Limit your interface to 1 accent color, 2 text shades, and 2 background shades.
- [ ] **Is the layout breathing?** Increase white space by at least 20% more than you think you need.
- [ ] **Are icons uniform?** Keep all icons from the same set, utilizing the same stroke-width (ideally 1.5px or 2px outline icons). Avoid solid filled icons mixed with outline icons.
