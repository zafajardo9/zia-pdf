# Whole-System Design Refresh

## 1. Goal

Redesign Zia-PDF as a cohesive, modern minimalist PDF workspace across its web/PWA and Android surfaces while preserving all current local-only PDF behavior. The finished interface should look recognizably new: a neutral, typography-led system with one blue accent, compact geometry, flat tonal hierarchy, consistent workflow states, and restrained motion derived from `DESIGN.md`.

## 2. Context Summary

Confirmed repository facts:

- Zia-PDF is a React 18 and TypeScript application built with Vite, Tailwind CSS, React Router, and Capacitor for Android.
- The README makes privacy, offline operation, no telemetry, and cross-platform parity non-negotiable product constraints.
- `DESIGN.md` defines the target direction: monochromatic light/dark surfaces, a single blue accent, 6px/12px radii, 1px borders, flat tonal elevation, compact typography, and purposeful motion.
- The current implementation uses a rose accent, many category-specific colors, large 2rem–2.5rem radii, frequent `font-black`, large shadows/glows, and separate desktop/mobile presentation patterns.
- Seventeen tool routes already share `NativeToolLayout`, and most use `PrivacyBadge` and `SuccessState`, making those components the best migration seam.
- Tool-specific behavior is implemented directly inside each tool component. The redesign must preserve file loading, locked-file handling, configuration, processing, success, download, reset, preview, drag-and-drop, and OCR states.
- The working tree already contains a modified `README.md` and an untracked `DESIGN.md`; these are user-owned changes and must not be overwritten accidentally.

Assumptions:

- The redesign changes presentation and interaction structure, not PDF-processing algorithms or advertised features.
- Plus Jakarta Sans can remain as the local, offline-safe primary font while adopting the type scale and weights from `DESIGN.md`; introducing a remotely loaded font would violate offline-first goals.
- The blue accent from `DESIGN.md` replaces rose and per-category accent colors for interactive emphasis. Semantic red, green, and amber remain limited to errors, success, and warnings.
- Web and Android keep platform-appropriate navigation, safe-area handling, and touch sizing, but consume one shared token and component language.
- Existing tool routes and URLs remain stable.

Missing information to resolve during implementation review:

- Whether the existing Zia-PDF logo should retain its rose fill or move to the blue accent. The recommended default is blue for full system consistency.
- Whether dark mode should stay manually selectable plus system-aware as it is today. The recommended default is to keep all three settings while ensuring each route honors the same token set.
- There is no automated frontend test framework configured; validation currently depends on TypeScript, ESLint, production builds, and manual/browser checks unless a lightweight test setup is approved.

## 3. Scope

- Establish semantic design tokens for color, typography, spacing, radii, borders, elevation, focus, motion, and safe areas.
- Align Tailwind configuration and global CSS with the new system.
- Redesign the global application shell, desktop navigation, Android navigation, drawers, modals, quick-drop flow, loading states, and toasts.
- Redesign the desktop dashboard, Android home, tool catalog, history, settings, About, Thanks, Privacy Policy, and PDF preview surfaces.
- Build or consolidate reusable primitives for buttons, icon buttons, fields, select controls, cards, badges, segmented controls, file drop zones, file summaries, progress, empty states, dialogs, and page thumbnails.
- Normalize every PDF tool around a consistent state model: select file, inspect/unlock, configure, process, complete, download/reset.
- Preserve responsive layouts, Android safe areas, touch interactions, dark mode, keyboard access, reduced motion, and screen-reader labeling.
- Update `DESIGN.md` where necessary so the implemented tokens, component rules, responsive behavior, accessibility requirements, and workflow patterns remain the canonical specification.
- Refresh screenshots only after the implementation is stable and visually verified.

## 4. Out of Scope

- Changes to PDF manipulation, encryption, OCR, storage, history, pipeline, or workspace-persistence algorithms.
- New PDF tools, accounts, cloud uploads, analytics, telemetry, advertisements, or server-side processing.
- Route renaming, database creation, backend services, authentication, or network APIs.
- A full brand or product rename.
- Replacing Lucide with another icon library.
- Adding ornamental animation, external font delivery, or runtime dependencies that compromise offline operation.
- Rebuilding native Android resources unless the approved logo/accent change requires launcher or splash asset updates.

## 5. Affected Files and Folders

```txt
DESIGN.md
tailwind.config.js
src/
├── App.tsx
├── index.css
├── types.ts
└── components/
    ├── Layout.tsx
    ├── WebView.tsx
    ├── AndroidView.tsx
    ├── AndroidToolsView.tsx
    ├── AndroidHistoryView.tsx
    ├── PdfPreview.tsx
    ├── Settings.tsx
    ├── About.tsx
    ├── Thanks.tsx
    ├── PrivacyPolicy.tsx
    ├── Logo.tsx
    ├── ui/                         (candidate new shared primitives)
    └── tools/
        ├── shared/
        │   ├── NativeToolLayout.tsx
        │   ├── ToolHeader.tsx
        │   ├── PrivacyBadge.tsx
        │   ├── SuccessState.tsx
        │   └── workflow/           (candidate shared workflow states)
        ├── MergeTool.tsx
        ├── SplitTool.tsx
        ├── CompressTool.tsx
        ├── ProtectTool.tsx
        ├── UnlockTool.tsx
        ├── RotateTool.tsx
        ├── RearrangeTool.tsx
        ├── PageNumberTool.tsx
        ├── WatermarkTool.tsx
        ├── MetadataTool.tsx
        ├── SignatureTool.tsx
        ├── GrayscaleTool.tsx
        ├── PdfToImageTool.tsx
        ├── ImageToPdfTool.tsx
        ├── ExtractImagesTool.tsx
        ├── PdfToTextTool.tsx
        └── RepairTool.tsx
assets/preview/
fastlane/metadata/android/en-US/images/phoneScreenshots/
```

`src/index.css` and `tailwind.config.js` are the token and utility foundation. `src/components/Layout.tsx` and `src/App.tsx` own global chrome and overlays. `src/components/tools/shared/` is the primary seam for migrating all workflows consistently before touching tool-specific layouts. A small `src/components/ui/` folder is a candidate for presentation-only primitives; it should be introduced only where it removes repeated class strings and state behavior. Existing PDF and persistence utilities should be reviewed for integration constraints but should not require design-related edits.

## 6. Step-by-Step Implementation Plan

1. Freeze behavior and create a visual inventory.
   - Record every route, navigation variant, tool state, overlay, empty state, locked-file state, progress state, success state, and responsive breakpoint.
   - Capture baseline screenshots for representative desktop and Android-sized routes.
   - Identify repeated Tailwind patterns and behavioral differences that shared primitives must absorb.
   - Affected files: all files under `src/components/`, with no changes required in this step.
   - Dependency: complete before refactoring so regressions are measurable.

2. Turn `DESIGN.md` into an implementation-ready source of truth.
   - Correct ambiguous wording and document the exact light/dark semantic tokens, semantic status colors, typography scale, 4px/8px spacing rules, 6px/12px radii, border rules, focus ring, disabled state, transition durations, reduced-motion behavior, responsive breakpoints, minimum touch targets, and icon sizing.
   - Add component anatomy for shell navigation, buttons, fields, surfaces, dialogs, drop zones, file rows, page thumbnails, progress, and success states.
   - Define when platform layouts may differ and which visual properties must remain shared.
   - Affected file: `DESIGN.md`.
   - Dependency: must precede token and component implementation.

3. Implement the semantic token foundation.
   - Define CSS custom properties for canvas, surface, elevated surface, hover, primary/muted text, border, accent, accent contrast, focus, semantic status, radii, and restrained elevation.
   - Update Tailwind theme extensions to expose the semantic palette, radii, shadows, font sizes, and motion timings without scattering hex values.
   - Retain local Plus Jakarta Sans files and reduce default weight usage from 800/900 to 400/500/600 where hierarchy permits.
   - Remove the global transition rule that targets every `div`, input, and button; apply short property-specific transitions only to interactive primitives and honor `prefers-reduced-motion`.
   - Affected files: `src/index.css`, `tailwind.config.js`.
   - Dependency: must land before component migration.

4. Build the shared UI primitive layer.
   - Create typed, presentation-focused primitives for Button, IconButton, Field/Input, Select, Card/Surface, Badge, SegmentedControl, Dialog/Sheet, Progress, EmptyState, and FileDropZone only where they eliminate recurring markup.
   - Support variants through explicit props rather than concatenating arbitrary category colors.
   - Include focus-visible treatment, accessible labels, disabled semantics, loading semantics, keyboard behavior, and minimum touch sizes.
   - Avoid a large generic component framework; keep PDF-specific data behavior in existing tool components.
   - Affected folder: candidate `src/components/ui/`.
   - Dependencies: semantic tokens complete; establish primitives before screens.

5. Redesign the application shell and navigation.
   - Rework desktop navigation into a compact unified title/navigation bar with clear active states, one accent, and flatter drawers.
   - Rework Android navigation with the same tokens and icon language while keeping safe-area padding and platform touch behavior.
   - Normalize history drawer, global drop target, theme controls, view-mode controls, footer links, and toast placement.
   - Preserve existing routing, file-drop dispatch, history behavior, and Capacitor platform detection.
   - Affected files: `src/components/Layout.tsx`, `src/App.tsx`, `src/components/Logo.tsx`.
   - Dependencies: primitives and tokens complete.

6. Redesign global overlays and transient states.
   - Replace the oversized, heavily rounded Quick Drop modal with the shared dialog/sheet anatomy and a concise file summary plus searchable/organized action list.
   - Restyle loading, locked-file, confirmation, and error states with restrained motion and semantic feedback.
   - Ensure focus is trapped/restored in dialogs, Escape closes dismissible overlays, and touch sheets respect safe areas.
   - Affected files: `src/App.tsx`, `src/components/Layout.tsx`, shared UI primitives.
   - Dependencies: shell and dialog primitives.

7. Refresh the web dashboard.
   - Replace the oversized marketing hero with a workspace-oriented header that foregrounds privacy, search, and fast access to tools.
   - Convert tool cards from colorful floating tiles to flat, compact modules using one accent and subtle category metadata.
   - Keep search and category filtering, improve empty results, make result counts accessible, and define responsive density for one-, two-, and three-column layouts.
   - Affected file: `src/components/WebView.tsx`; tool metadata in `src/App.tsx` may be simplified to semantic category data rather than color class strings.
   - Dependencies: shell, tokens, and card/segmented-control primitives.

8. Refresh Android home, catalog, and history.
   - Align `AndroidView` with the new desktop information architecture while retaining thumb-friendly actions, recent activity, and quick file selection.
   - Replace colorful bento tiles and glowing hero treatments with compact tonal modules and one primary action.
   - Apply the same search, category, file-row, empty-state, and metadata rules to `AndroidToolsView` and `AndroidHistoryView`.
   - Affected files: `src/components/AndroidView.tsx`, `src/components/AndroidToolsView.tsx`, `src/components/AndroidHistoryView.tsx`.
   - Dependencies: web information architecture approved and primitives complete.

9. Rebuild the shared tool-workflow frame.
   - Update `NativeToolLayout` to provide a consistent responsive content width, compact header, optional sticky action region, desktop/mobile back behavior, and safe-area handling.
   - Update `ToolHeader`, `PrivacyBadge`, and `SuccessState` to the new type scale, semantic colors, compact geometry, and accessible status announcements.
   - Add shared workflow components for file drop, selected-file summary, encrypted-file prompt, configuration section, processing progress, and completion only when repeated markup proves stable across several tools.
   - Affected files: `src/components/tools/shared/` and candidate `src/components/tools/shared/workflow/`.
   - Dependency: complete before migrating individual tools.

10. Migrate tools by interaction family.
    - Batch A, simple single-file actions: Repair, Grayscale, Unlock, Protect, PDF to Image, Extract Images. Standardize upload, selected file, password/configuration, progress, and result states.
    - Batch B, form-heavy actions: Watermark, Page Numbers, Metadata, Signature, PDF to Text. Standardize labeled controls, inline help, validation, preview, and action placement.
    - Batch C, visual page actions: Split, Rotate, Rearrange. Standardize page thumbnail selection, page labels, hover/selected/focus states, drag affordances, and responsive grids.
    - Batch D, multi-file actions: Merge, Compress, Image to PDF. Standardize sortable file lists, add/remove controls, aggregate progress, output naming, and completion.
    - Preserve each tool's handlers, processing calls, pipeline integration, object URL cleanup, and history recording.
    - Affected files: all seventeen components under `src/components/tools/`.
    - Dependencies: shared workflow frame stable; validate each batch before starting the next.

11. Redesign supporting routes and document preview.
    - Apply the same shell, typography, surfaces, fields, toggles, and status language to Settings, About, Thanks, Privacy Policy, and PDF Preview.
    - Keep settings storage keys and behavior unchanged.
    - Ensure long-form legal/about content remains readable with sensible line length and heading hierarchy.
    - Ensure preview controls remain discoverable by keyboard and touch and that page/canvas content receives maximum space.
    - Affected files: `src/components/Settings.tsx`, `src/components/About.tsx`, `src/components/Thanks.tsx`, `src/components/PrivacyPolicy.tsx`, `src/components/PdfPreview.tsx`.
    - Dependencies: shell and shared primitives complete.

12. Perform cross-system polish and remove legacy styling.
    - Search for old rose/category palette classes, arbitrary 2rem+ radii, heavy shadow/glow classes, uncontrolled `font-black`, inconsistent border widths, and global animation utilities.
    - Retain semantic colors only for status and data meaning.
    - Verify light and dark contrast, visible focus, consistent icon stroke width, truncation, long filenames, narrow Android screens, tablets, desktop widths, and reduced motion.
    - Affected files: all migrated presentation components.
    - Dependency: all route migrations complete.

13. Verify behavior and refresh visual assets.
    - Run lint and production build, then manually exercise every route and representative error/locked/success flow without network access.
    - Compare web and Android-sized screenshots against `DESIGN.md` and correct layout drift.
    - After approval, update preview and store screenshots to represent the redesigned product; update native brand assets only if the logo/accent decision requires it.
    - Affected files: `assets/preview/`, `fastlane/metadata/android/en-US/images/phoneScreenshots/`, and possibly icon/splash assets.
    - Dependencies: final implementation and visual approval.

## 7. Database Changes

No database changes required.

## 8. Backend Changes

There is no backend service in the inspected architecture, and none should be introduced. PDF processing, OCR, file selection, recent activity, workspace persistence, and downloads must continue to run locally. Existing utility contracts in `src/utils/` should remain unchanged unless a presentation component needs a non-breaking state signal; any such change must preserve offline behavior and avoid new network calls.

## 9. Frontend Changes

The frontend will receive a complete visual-system migration: semantic CSS/Tailwind tokens, a compact cross-platform application shell, shared UI primitives, standardized tool workflow states, redesigned web and Android dashboards, consistent settings/informational pages, and an improved preview experience. Tool logic should remain inside existing components, while repeated visual/state presentation moves into narrowly scoped shared components.

Responsive behavior should use the same information hierarchy across platforms, with layout density adapting rather than duplicating visual languages. Desktop should prioritize scanning and workspace width; Android should prioritize safe areas, 44px minimum touch targets, bottom navigation, and sticky actions. All routes must provide explicit loading, empty, encrypted, invalid, processing, success, and reset states where applicable.

## 10. Validation Rules

- Continue accepting only the file types each tool currently supports; surface rejection next to the drop zone rather than only through transient toast messages.
- Preserve file-count and page-range constraints for merge, split, reorder, conversion, and batch workflows.
- Validate required passwords, matching confirmation, and supported encryption flows before enabling actions.
- Validate numeric inputs such as quality, page number position, rotation, opacity, size, and page ranges against their current safe boundaries.
- Prevent blank or invalid output names and normalize extensions without duplicating them.
- Disable primary actions while processing and prevent duplicate submissions.
- Display long filenames safely with truncation plus an accessible full-name label or tooltip.
- Announce progress and completion without producing excessive screen-reader updates.
- Keep destructive reset, remove, and clear-history actions visually distinct and confirm them when data loss would surprise the user.

## 11. Security Considerations

- Preserve the no-upload guarantee: no analytics, remote fonts, third-party image calls, or network-backed UI assets.
- Do not log filenames, passwords, extracted text, metadata, document contents, or file buffers.
- Password fields must use appropriate input types, avoid persistence, and clear when a workflow resets.
- Keep object URL creation and revocation behavior intact to avoid retaining sensitive documents in memory longer than needed.
- Preserve auto-wipe, local history, pipeline, and workspace-persistence semantics; design changes must not expand stored data.
- Keep file type and malformed-document validation in place, and present errors without exposing raw document contents.
- Maintain keyboard-safe dialogs and visible focus so security-sensitive confirmations cannot be triggered ambiguously.
- Verify that Android file intents and sharing continue to use existing local Capacitor paths only.

## 12. Testing Plan

- Run `npm run lint` with zero warnings.
- Run `npm run build` to validate TypeScript and the production bundle.
- If test infrastructure is approved, add focused component tests for Button, Dialog/Sheet, SegmentedControl, FileDropZone, and shared workflow states; otherwise document manual coverage explicitly.
- Verify the happy path for all seventeen tools: load supported file(s), configure, process, download, and start over.
- Verify locked, malformed, unsupported, oversized, empty, cancelled, and processing-failure paths where supported.
- Verify multi-file add/remove/reorder and visual page selection/drag behavior using pointer, touch, and keyboard inputs.
- Verify search and category filters, no-results states, recent activity, history clearing, settings persistence, theme modes, auto-wipe settings, global drop, and Android file-intent import.
- Verify every route in light and dark mode at narrow phone, large phone, tablet, laptop, and wide desktop widths.
- Verify 200% zoom, long filenames, large page counts, slow processing, text wrapping, and empty histories.
- Verify Tab order, focus visibility, Escape behavior, dialog focus restoration, accessible names, status announcements, contrast, and reduced-motion behavior.
- Verify the application makes no unexpected network requests during normal operation and remains usable offline.
- Perform Android emulator/device smoke testing for safe areas, bottom navigation, back behavior, file picker, haptics, download/share, and rotation.
- Compare approved before/after screenshots for shell, dashboard, one tool from each interaction family, settings, locked state, and success state.

## 13. Rollback Plan

Implement the redesign in small commits organized by tokens/primitives, shell, dashboards, shared workflow, tool batches, supporting pages, and assets. If a batch regresses behavior, revert only that batch while retaining already verified foundation work. Keep routes, tool logic, and storage keys stable so no data migration or user-data rollback is needed. Do not remove legacy styles until the corresponding component migration passes verification. Preserve the current preview/store screenshots until the redesign has final approval so visual assets can be restored independently. Because `README.md` and `DESIGN.md` already contain user changes, inspect and merge rather than overwrite them during rollback or implementation.

## 14. Final Checklist

- [ ] Plan reviewed
- [ ] Files identified
- [ ] Database changes checked
- [ ] Backend changes checked
- [ ] Frontend changes checked
- [ ] Validation rules checked
- [ ] Security considerations checked
- [ ] Tests planned
- [ ] Rollback plan reviewed
- [ ] Assumptions and open questions resolved
