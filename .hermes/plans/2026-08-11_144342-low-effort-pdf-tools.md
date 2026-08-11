# 5 Low-Effort PDF Tools — Implementation Plan

> **For Hermes:** Implement this plan task-by-task. Verify with `npm run build` (tsc type-check) + manual QA in `npm run dev` after each tool.

**Goal:** Add 5 new client-side PDF tools to Zia-PDF: **Crop Pages**, **Resize Pages**, **Remove Pages**, **Bookmarks**, **Viewer Preferences** — all backed by `pdf-lib` APIs, matching the existing tool conventions exactly.

**Architecture:** Each tool is a self-contained component in `src/components/tools/` that follows the MetadataTool/SplitTool template: hidden file input + pipeline consume → `getPdfMetaData` (locked-check) → optional unlock gate → `pdf-lib` processing → `SuccessState` (download/share/preview) → `PrivacyBadge`. A new shared hook (`usePdfToolFile`) absorbs the file-load/unlock boilerplate so the 5 new tools stay lean. Tools are registered statically in `App.tsx` (import + `tools[]` entry + `<Route>`), matching the existing 16 tools.

**Tech Stack:** React 18 + TypeScript (strict), `pdf-lib` 1.17, `pdfjs-dist` 5.x (thumbnails), `lucide-react`, Tailwind. No new dependencies.

---

## 0. Codebase Conventions (implementer must follow)

- Tool files: `src/components/tools/<Name>Tool.tsx`, default-exported component, filename pattern matches existing tools.
- Shell: `<NativeToolLayout title="..." description="..." actions={...}>` — `actions` renders the sticky bottom bar; `children` is the body.
- File pick: hidden `<input type="file" accept=".pdf" className="hidden" ref={fileInputRef} ...>`.
- Pipeline: consume `usePipeline().consumePipelineFile()` in a mount `useEffect`, reconstruct `new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })`.
- Locked files: `getPdfMetaData(file)` → if `isLocked`, render password gate; `unlockPdf(file, password)` → then load with `PDFDocument.load(arrayBuffer, { password, ignoreEncryption: true } as any)`.
- Result: `const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })` → `URL.createObjectURL` → `setDownloadUrl` → `<SuccessState message downloadUrl fileName onStartOver showPreview />` → `addActivity({ name, tool, size: blob.size, resultUrl })`.
- Filename default: `${file.name.replace('.pdf', '')}-<tool>` and `${BRAND.filePrefix}-<tool>` before a file loads.
- Locked-file password gate + unlock button UI: copy verbatim from `MetadataTool.tsx` (lines 168–176) — the `bg-white dark:bg-zinc-900 p-8 rounded-xl ...` card with the Lock icon.
- No test runner exists in this repo (no vitest/jest). Verification = `npm run build` (tsc strict) + `npm run lint` + manual QA in dev. Do **not** add a test framework for these 5 tools.

---

## Task 1: Shared hook `usePdfToolFile`

**Objective:** Extract the file-load / locked-check / unlock / pdf-lib-load boilerplate so the 5 new tools don't duplicate ~40 lines each. New code only — do NOT refactor existing tools.

**Files:**
- Create: `src/utils/usePdfToolFile.ts`

**Step 1: Write the hook**

```ts
import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { getPdfMetaData, unlockPdf } from './pdfHelpers'
import { usePipeline } from './pipelineContext'

export interface PdfToolFileState {
  file: File
  pageCount: number
  isLocked: boolean
  password?: string
}

export function usePdfToolFile() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { consumePipelineFile } = usePipeline()
  const [pdfData, setPdfData] = useState<PdfToolFileState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })
      handleFile(file)
    }
  }, [])

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') return
    setIsProcessing(true)
    try {
      const meta = await getPdfMetaData(file)
      setPdfData({ file, pageCount: meta.pageCount, isLocked: meta.isLocked })
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnlock = async (password: string): Promise<boolean> => {
    if (!pdfData) return false
    setIsProcessing(true)
    const result = await unlockPdf(pdfData.file, password)
    if (result.success) {
      setPdfData({ ...pdfData, isLocked: false, password, pageCount: result.pageCount })
      setIsProcessing(false)
      return true
    }
    setIsProcessing(false)
    return false
  }

  const loadPdfDocument = async (): Promise<PDFDocument> => {
    if (!pdfData) throw new Error('No file loaded')
    const arrayBuffer = await pdfData.file.arrayBuffer()
    return PDFDocument.load(arrayBuffer, {
      password: pdfData.password || undefined,
      ignoreEncryption: true,
    } as any)
  }

  const reset = () => setPdfData(null)

  return { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument, reset }
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

**Step 3: Commit**

```bash
git add src/utils/usePdfToolFile.ts
git commit -m "feat: add shared usePdfToolFile hook"
```

---

## Task 2: Crop Pages tool

**Objective:** Trim margins from every page by rewriting the MediaBox + CropBox. `page.setCropBox()` alone is ignored by some viewers, so always set **both** MediaBox and CropBox to the same rect.

**Files:**
- Create: `src/components/tools/CropTool.tsx`

**Step 1: Core processing (complete, copy-pasteable)**

```ts
// Inside the component, using the hook from Task 1:
const cropPdf = async (margins: { top: number; bottom: number; left: number; right: number }) => {
  setIsProcessing(true)
  await new Promise(resolve => setTimeout(resolve, 300)) // min spinner time, matches MetadataTool
  try {
    const doc = await loadPdfDocument()
    for (const page of doc.getPages()) { // v1: applies to all pages
      const { width, height } = page.getSize()
      const x = margins.left
      const y = margins.bottom
      const w = Math.max(width - margins.left - margins.right, 1)   // guard against 0/negative
      const h = Math.max(height - margins.top - margins.bottom, 1)
      page.setMediaBox(x, y, w, h)
      page.setCropBox(x, y, w, h)
    }
    const pdfBytes = await doc.save()
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    addActivity({ name: `${customFileName}.pdf`, tool: 'Crop', size: blob.size, resultUrl: url })
  } catch (error: any) {
    toast.error(`Error: ${error.message}`)
  } finally {
    setIsProcessing(false)
  }
}
```

**Step 2: UI spec** (body between `{pdfData.isLocked ? <password gate> : <settings>}`)

- State: `margins = { top: 36, bottom: 36, left: 36, right: 36 }` (points; 72pt = 1in, ~28.35pt = 1cm), `customFileName`, `downloadUrl`.
- Controls: 4 labeled range inputs (`0`–`200`, step `1`), one per side, styled like MetadataTool inputs (`bg-gray-50 dark:bg-black rounded-xl px-4 py-3`).
- Preset chips row: **None** `{0,0,0,0}` / **Tight** `{24,24,24,24}` / **Normal** `{36,36,36,36}` / **Wide** `{72,72,72,72}`.
- Live readout under the sliders: `Result: {w} × {h} pt` computed from `page.getSize()` of page 1 minus margins (clamp ≥ 1). Keep it a text readout — a rendered crop preview is a stretch goal, out of scope for v1.
- File info card (name / `{pageCount} Pages • {MB}` / close button): copy the card markup from `MetadataTool.tsx` lines 179–186.
- Actions bar (only when `pdfData && !pdfData.isLocked && !downloadUrl`): full-width primary button `Crop Pages` with `Loader2` spinner while processing (copy ActionButtons pattern from MetadataTool).
- Output filename input (label `Output Filename`, default `${file.name.replace('.pdf','')}-crop`).
- Success: `<SuccessState message="Pages Cropped!" downloadUrl fileName={customFileName + '.pdf'} onStartOver={() => { setDownloadUrl(null); reset() }} />`, then `Close File` button + `<PrivacyBadge />` at the end (copy structure from MetadataTool lines 208–216).

**Step 3: Register in App.tsx** (see Task 6 for the full registration block — do the import, tools[] entry, and Route together at the end)

**Step 4: Verify**

Run: `npm run build`
Expected: tsc PASS, vite build PASS.
Manual QA in `npm run dev`: drop a PDF → set Wide → Crop → download → open result, margins visibly trimmed, content not clipped at edges (spot-check a page with text near margins).

**Step 5: Commit**

```bash
git add src/components/tools/CropTool.tsx
git commit -m "feat: add Crop Pages tool"
```

---

## Task 3: Resize Pages tool

**Objective:** Scale pages to a standard size or custom dimensions using `page.scaleContent()` + `page.setSize()`. pdf-lib has no content-translation API, so "fit with letterbox margins" is **not** possible without Form-XObject wrapping — v1 offers two honest modes (see limitations below).

**Files:**
- Create: `src/components/tools/ResizeTool.tsx`

**Step 1: Core processing (complete, copy-pasteable)**

```ts
const STANDARD_SIZES: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
}

const resizePdf = async (targetW: number, targetH: number, mode: 'fit' | 'exact') => {
  setIsProcessing(true)
  await new Promise(resolve => setTimeout(resolve, 300))
  try {
    const doc = await loadPdfDocument()
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize()
      if (mode === 'fit') {
        // Uniform scale: page becomes scale×original, aspect preserved, no distortion
        const scale = Math.min(targetW / width, targetH / height)
        page.scale(scale)
        page.setSize(width * scale, height * scale)
        page.setCropBox(0, 0, width * scale, height * scale)
      } else {
        // Exact: stretch content to fill target exactly (may distort aspect)
        page.scaleContent(targetW / width, targetH / height)
        page.setSize(targetW, targetH)
        page.setCropBox(0, 0, targetW, targetH)
      }
    }
    const pdfBytes = await doc.save()
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    addActivity({ name: `${customFileName}.pdf`, tool: 'Resize', size: blob.size, resultUrl: url })
  } catch (error: any) {
    toast.error(`Error: ${error.message}`)
  } finally {
    setIsProcessing(false)
  }
}
```

> Note: in `fit` mode, `page.scale(scale)` already scales the MediaBox; the explicit `setSize(width*scale, height*scale)` + `setCropBox` normalize any pre-existing crop box so viewers show the full page.

**Step 2: UI spec**

- State: `target: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'custom'`, `customW`/`customH` (number inputs, points), `mode: 'fit' | 'exact'`, `customFileName`, `downloadUrl`.
- Size picker: 5 preset chips (A4 default, shows `595 × 842 pt` sublabel) + a **Custom** chip that reveals two number inputs.
- Mode toggle: two segmented buttons — **Fit** ("keep proportions, may not fill page") and **Exact** ("fill page exactly, may stretch"). Style as small toggle buttons (user prefers toggles), e.g. `rounded-ui border border-line px-3 py-2 text-xs font-semibold` with active = `bg-accent text-white`.
- Show current size readout after load: `Current: {w} × {h} pt` (from `getPdfMetaData`-adjacent pdfjs load or from `pdf-lib` page 0 — simplest: load with pdf-lib in `handleFile`-time? No — keep it cheap: display after user picks a target, computed from pdf-lib inside the button handler is too late. Instead: `const first = doc.getPage(0)` — but doc is loaded per-processing. Simplest honest v1: show `{pageCount} pages • {MB}` card only; skip the live current-size readout.)
- File card, filename input (default `${file.name.replace('.pdf','')}-resize`), actions bar button `Resize Pages`, SuccessState `message="Pages Resized!"`, PrivacyBadge — same structure as Task 2.

**Step 3: Register** (with Task 6)

**Step 4: Verify**

Run: `npm run build` — expect PASS.
Manual QA: A4 doc → Letter/Exact → pages are 612×792pt, content stretched; A4 → A5/Fit → pages uniformly smaller, aspect intact. Confirm in a PDF viewer (page properties show new size).

**Step 5: Commit**

```bash
git add src/components/tools/ResizeTool.tsx
git commit -m "feat: add Resize Pages tool"
```

---

## Task 4: Remove Pages tool

**Objective:** Let the user tap thumbnails in a grid to mark pages for removal, then `doc.removePage()` from last to first so indices stay valid.

**Files:**
- Create: `src/components/tools/RemovePagesTool.tsx`

**Step 1: Core processing (complete, copy-pasteable)**

```ts
// Inside the component. `toRemove` is a Set of 1-based page numbers.
const removePages = async (toRemove: Set<number>) => {
  setIsProcessing(true)
  await new Promise(resolve => setTimeout(resolve, 300))
  try {
    const doc = await loadPdfDocument()
    const total = doc.getPageCount()
    if (toRemove.size >= total) throw new Error('Cannot remove all pages — keep at least one')
    const indices = [...toRemove].map(n => n - 1).sort((a, b) => b - a) // 0-based, descending
    for (const idx of indices) doc.removePage(idx)
    const pdfBytes = await doc.save()
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    addActivity({ name: `${customFileName}.pdf`, tool: 'Remove Pages', size: blob.size, resultUrl: url })
  } catch (error: any) {
    toast.error(`Error: ${error.message}`)
  } finally {
    setIsProcessing(false)
  }
}
```

**Step 2: Thumbnail grid — reuse SplitTool's pattern**

Copy `LazyThumbnail` (IntersectionObserver + `renderGridThumbnail(pdfDoc, pageNum)`) from `SplitTool.tsx` lines 24–47 verbatim, plus its lazy-load flow:
- On file load (not locked): `const pdfDoc = await loadPdfDocument(file)` (pdfjs) — store it in state (`pdfDoc?: any`).
- Grid: `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3` of pages; each cell shows `LazyThumbnail` + a page-number badge, `aspect-[3/4] overflow-hidden rounded-ui border` frame.
- Tap toggles the page in `removing: Set<number>`. Selected cells get `ring-2 ring-rose-500 border-rose-500` + a `-2` count badge (or a small `X` overlay); unselected = normal border. The existing `tool-workspace` CSS remaps rose → accent for APK; the web ring stays red via inline Tailwind — acceptable and matches how RepairTool uses rose (verify in dev).
- Summary line above grid: `{pageCount} pages • {removing.size} marked for removal`.
- "Remove All Pages" guard handled in core (throws).

**Step 3: UI structure** — file card, `Select pages to remove` heading, grid, actions bar button `Remove {n} Page(s)` (disabled when `removing.size === 0`), SuccessState `message="Pages Removed!"`, `Close File`, `PrivacyBadge`. Filename default `${file.name.replace('.pdf','')}-removed`.

**Step 4: Register** (with Task 6)

**Step 5: Verify**

Run: `npm run build` — expect PASS.
Manual QA: 5-page PDF → mark pages 2 & 4 → result has 3 pages, remaining order intact; try marking all pages → error toast, no download.

**Step 6: Commit**

```bash
git add src/components/tools/RemovePagesTool.tsx
git commit -m "feat: add Remove Pages tool"
```

---

## Task 5: Bookmarks tool

**Objective:** Add a flat clickable outline (bookmarks) to a PDF. Uses pdf-lib's low-level `context.obj` API — this is the documented approach (pdf-lib has no higher-level outline helper). Strings in `context.obj()` are auto-wrapped as PDFNames, so `'Fit'` and `'Outlines'` work as literals.

**Files:**
- Create: `src/components/tools/BookmarksTool.tsx`

**Step 1: Core processing (complete, copy-pasteable)**

```ts
import { PDFDocument, PDFName } from 'pdf-lib'

// items: { title: string; page: number } — page is 1-based
const addBookmarks = async (items: { title: string; page: number }[]) => {
  setIsProcessing(true)
  await new Promise(resolve => setTimeout(resolve, 300))
  try {
    const doc = await loadPdfDocument()
    const pageCount = doc.getPageCount()
    const valid = items.filter(i => i.title.trim().length > 0 && i.page >= 1 && i.page <= pageCount)
    if (valid.length === 0) throw new Error('Enter at least one bookmark with a valid page number')

    const outlineRef = doc.context.obj({ Type: 'Outlines', First: null, Last: null, Count: valid.length })
    const itemRefs = valid.map(item =>
      doc.context.obj({ Title: item.title.trim(), Parent: outlineRef, Dest: [doc.getPage(item.page - 1).ref, 'Fit'] })
    )

    outlineRef.set(PDFName.of('First'), itemRefs[0])
    outlineRef.set(PDFName.of('Last'), itemRefs[itemRefs.length - 1])
    itemRefs.forEach((ref, i) => {
      if (i > 0) ref.set(PDFName.of('Prev'), itemRefs[i - 1])
      if (i < itemRefs.length - 1) ref.set(PDFName.of('Next'), itemRefs[i + 1])
    })

    doc.catalog.set(PDFName.of('Outlines'), outlineRef)
    const pdfBytes = await doc.save()
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    addActivity({ name: `${customFileName}.pdf`, tool: 'Bookmarks', size: blob.size, resultUrl: url })
  } catch (error: any) {
    toast.error(`Error: ${error.message}`)
  } finally {
    setIsProcessing(false)
  }
}
```

> If the source doc already has an outline, `doc.catalog.set(PDFName.of('Outlines'), ...)` **replaces** it. Note this in the UI ("replaces any existing bookmarks") — replacing is the intended v1 behavior and avoids merge complexity.

**Step 2: UI spec**

- State: `bookmarks: { id: string; title: string; page: string }[]` (start with one empty row), `customFileName`, `downloadUrl`.
- Rows: for each bookmark — title text input + page number input (numeric) + remove-row `X` button (only when > 1 row). Inputs styled like MetadataTool (`bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500`).
- `+ Add Bookmark` dashed button below the rows.
- Helper text: `Page numbers are 1-based. Pages beyond {pageCount} are ignored.` (pageCount from hook state).
- File card, actions bar `Add Bookmarks` (disabled when all rows empty), SuccessState `message="Bookmarks Added!"`, `Close File`, `PrivacyBadge`. Filename default `${file.name.replace('.pdf','')}-bookmarks`.
- Optional stretch (do NOT do in v1): nested/indented bookmarks (Parent/First/Last per level).

**Step 3: Register** (with Task 6)

**Step 4: Verify**

Run: `npm run build` — expect PASS.
Manual QA: 3-page PDF, bookmarks `Intro→1`, `Body→2`, `End→3` → open result in a viewer that shows the outline pane (Acrobat/macOS Preview may hide it — test in Chrome's PDF viewer or Adobe; bookmarks sidebar should list 3 items, clicking jumps to the right page).

**Step 5: Commit**

```bash
git add src/components/tools/BookmarksTool.tsx
git commit -m "feat: add Bookmarks tool"
```

---

## Task 6: Viewer Preferences tool

**Objective:** Control how the PDF opens: page layout, page mode, and initial zoom. `setPageLayout()` / `setPageMode()` are direct pdf-lib catalog writes; initial zoom needs a catalog `OpenAction` destination (small hand-written dict — pdf-lib has no helper for it).

**Files:**
- Create: `src/components/tools/ViewerPrefsTool.tsx`

**Step 1: Core processing (complete, copy-pasteable)**

```ts
import { PDFDocument, PDFName } from 'pdf-lib'

type Layout = 'SinglePage' | 'OneColumn' | 'TwoColumnLeft' | 'TwoColumnRight' | 'TwoPageLeft' | 'TwoPageRight'
type Mode = 'UseNone' | 'UseOutlines' | 'UseThumbs' | 'FullScreen' | 'UseOC' | 'UseAttachments'

// zoom: 'default' | 'fit' | 'fitWidth' | percentage number (e.g. 150)
const applyPrefs = async (layout: Layout | '', mode: Mode | '', zoom: string | number) => {
  setIsProcessing(true)
  await new Promise(resolve => setTimeout(resolve, 300))
  try {
    const doc = await loadPdfDocument() // loads with ignoreEncryption + password — required, setPageLayout throws on encrypted docs
    if (layout) doc.setPageLayout(layout)
    if (mode) doc.setPageMode(mode)
    if (zoom !== 'default') {
      const first = doc.getPage(0)
      if (zoom === 'fit') doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj([first.ref, 'Fit']))
      else if (zoom === 'fitWidth') doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj([first.ref, 'FitH', null]))
      else doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj([first.ref, 'XYZ', null, null, Number(zoom) / 100]))
    }
    const pdfBytes = await doc.save()
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    addActivity({ name: `${customFileName}.pdf`, tool: 'Viewer Preferences', size: blob.size, resultUrl: url })
  } catch (error: any) {
    toast.error(`Error: ${error.message}`)
  } finally {
    setIsProcessing(false)
  }
}
```

**Step 2: UI spec**

- State: `layout: Layout | ''` (default `''` = leave unchanged), `mode: Mode | ''`, `zoom: 'default' | 'fit' | 'fitWidth' | 50 | 75 | 100 | 125 | 150 | 200` (default `'default'`), `customFileName`, `downloadUrl`.
- Three stacked control groups, each: `system-label` caption + wrap of selectable chips:
  - **Page Layout** (default "Don't change"): Single Page, One Column, Two Column, Two Page — map to the pdf-lib enum values above.
  - **Page Mode** (default "Don't change"): None, Show Bookmarks, Show Thumbnails, Full Screen.
  - **Initial Zoom** (default "Default"): Fit Page, Fit Width, 50%, 75%, 100%, 125%, 150%, 200%.
- Chip style (matches user's toggle preference): `rounded-ui border border-line px-3 py-2 text-xs font-semibold`, active = `bg-accent text-white border-accent`.
- File card, actions bar `Apply Preferences`, SuccessState `message="Viewer Preferences Applied!"`, `Close File`, `PrivacyBadge`. Filename default `${file.name.replace('.pdf','')}-prefs`.
- Helper text: `Layout & mode are ignored by some viewers; most honor initial zoom.`

**Step 3: Register** (with Task 7)

**Step 4: Verify**

Run: `npm run build` — expect PASS.
Manual QA: set Zoom 150% + Full Screen → open in Acrobat/Chrome → opens at 150% on page 1. Verify each enum value saves without error.

**Step 5: Commit**

```bash
git add src/components/tools/ViewerPrefsTool.tsx
git commit -m "feat: add Viewer Preferences tool"
```

---

## Task 7: Register all 5 tools in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add lucide icon imports** (extend the existing `lucide-react` import block, keep alphabetical-ish grouping)

```ts
import { ... existing ..., Crop, Scaling, FileMinus2, Bookmark, AppWindow } from 'lucide-react'
```

> Icon choice per tool: Crop → `Crop`; Resize → `Scaling`; Remove Pages → `FileMinus2`; Bookmarks → `Bookmark`; Viewer Preferences → `AppWindow`. All exist in lucide-react. Swap freely if a different icon reads better.

**Step 2: Add static component imports** (after the existing tool imports, e.g. after `GrayscaleTool`)

```ts
import CropTool from './components/tools/CropTool'
import ResizeTool from './components/tools/ResizeTool'
import RemovePagesTool from './components/tools/RemovePagesTool'
import BookmarksTool from './components/tools/BookmarksTool'
import ViewerPrefsTool from './components/tools/ViewerPrefsTool'
```

**Step 3: Add entries to the `tools` array** (append at the end, before the closing `]`)

```ts
  { title: 'Crop Pages', desc: 'Trim margins or whitespace from your pages.', icon: Crop, implemented: true, path: '/crop-pdf', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Resize Pages', desc: 'Scale pages to standard or custom sizes.', icon: Scaling, implemented: true, path: '/resize-pdf', category: 'Optimize', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Remove Pages', desc: 'Delete specific pages from your document.', icon: FileMinus2, implemented: true, path: '/remove-pages', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Bookmarks', desc: 'Add a clickable table of contents to your PDF.', icon: Bookmark, implemented: true, path: '/bookmarks', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Viewer Preferences', desc: 'Control how your PDF opens — layout, mode, zoom.', icon: AppWindow, implemented: true, path: '/viewer-preferences', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
```

> Category choices are a proposal: Resize → Optimize (matches Compress/Grayscale), the rest → Edit. `QuickDropModal` picks the first 4 tools as "Suggested" automatically; these 5 land in "Full Tool Catalog" without code changes.

**Step 4: Add routes** (after `<Route path="/grayscale" ... />`)

```tsx
                <Route path="/crop-pdf" element={<CropTool />} />
                <Route path="/resize-pdf" element={<ResizeTool />} />
                <Route path="/remove-pages" element={<RemovePagesTool />} />
                <Route path="/bookmarks" element={<BookmarksTool />} />
                <Route path="/viewer-preferences" element={<ViewerPrefsTool />} />
```

**Step 5: Verify**

Run: `npm run build` and `npm run lint`
Expected: both PASS (`lint` uses `--max-warnings 0`).
Manual QA: home page shows 21 tools; each new tool reachable from the catalog dropdown, from `/` web grid (WebView renders all tools), and from Android tools grid.

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register crop, resize, remove-pages, bookmarks, viewer-prefs tools"
```

---

## Final Verification

1. `npm run build` — tsc strict + vite build, PASS.
2. `npm run lint` — zero warnings.
3. Manual QA matrix in `npm run dev` (web) and, if an APK build is available, on Android:

| Tool | Load | Locked file | Process | Result |
|---|---|---|---|---|
| Crop Pages | ✅ | ✅ unlock gate | Wide preset → download | Margins trimmed, no clipping |
| Resize Pages | ✅ | ✅ | A4→Letter Exact + A5 Fit | Correct dims in viewer properties |
| Remove Pages | ✅ | ✅ | Remove 2 of 5 → download | 3 pages, order intact |
| Bookmarks | ✅ | ✅ | 3 entries → download | Outline visible, jumps correct |
| Viewer Preferences | ✅ | ✅ | 150% + Full Screen | Opens at 150% |

4. Pipeline test: drag a PDF onto home → pick a new tool from QuickDrop → file auto-loads (consumePipelineFile path).
5. `git status` clean except intended files.

---

## Risks, Tradeoffs & Open Questions

- **Crop is destructive to the content box** — we rewrite MediaBox/CropBox (not just CropBox) so all viewers honor it. Tradeoff: content outside the crop is permanently discarded (that's the point of cropping; a non-destructive "hide" isn't possible with pdf-lib).
- **Resize "fit" cannot center content with letterbox margins** — pdf-lib has no content-translate API; centering would require Form XObject wrapping (medium effort, out of scope). The `fit` mode uniformly scales so content always fills the page without distortion; `exact` stretches. If letterboxed fit is later required, it becomes its own task.
- **Bookmarks replaces existing outlines** — acceptable v1 behavior, surfaced in the UI copy. Nested multi-level bookmarks deferred (needs per-level Parent/First/Last bookkeeping).
- **Viewer preferences are hints, not guarantees** — `FullScreen` and layout are ignored by some viewers (Chrome ignores FullScreen; Safari ignores layout). Initial zoom via `OpenAction` is the most widely honored. This is inherent to the PDF spec, not a bug.
- **`setPageLayout`/`setPageMode` throw on encrypted docs** — handled by loading with `{ password, ignoreEncryption: true }` (already in the hook).
- **No test runner in repo** — verification is tsc + lint + manual QA; adding vitest is a separate decision (open question: worth introducing for pdf-lib output assertions? probably overkill for these 5).
- **QuickDropModal "Suggested tools"** stays as the first 4 existing tools — no change required, but if any of the new 5 should be featured, that's a one-line slice change.

---

## Deliverables Summary

- New: `src/utils/usePdfToolFile.ts`
- New: `src/components/tools/{CropTool,ResizeTool,RemovePagesTool,BookmarksTool,ViewerPrefsTool}.tsx`
- Modified: `src/App.tsx` (icons, imports, tools[], routes)
- Result: 21 tools total, all client-side, no new dependencies, AGPL headers on all new files (copy the header block from `pdfHelpers.ts` lines 1–9).
