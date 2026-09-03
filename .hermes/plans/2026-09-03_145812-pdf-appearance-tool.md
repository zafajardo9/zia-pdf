# Plan: PDF Appearance Tool (Look & Tone Filters)

## Goal

Add a client-side **PDF Appearance** tool to Zia-PDF: apply visual tone filters — Brighten, Darken (night mode), High Contrast, Invert, Sepia, Grayscale — to every page of a PDF, with a live before/after preview, all 100% in-browser.

## Current context / assumptions

- Repo: `/Users/zafajardo/Documents/Development/zia-pdf`. React 18 + TS strict, Vite 5, Capacitor 8, AGPL. **26 tools** currently registered. No test runner — verification = Node harness + `npm run build` + `npm run lint` (max-warnings 0).
- **`GrayscaleTool.tsx` is the base template** and this tool generalizes it. Its exact working pattern (`src/components/tools/GrayscaleTool.tsx:61-119`): pdfjs `getPage(i)` → `getViewport({ scale: 1.5 })` → render to canvas → mutate pixels via `getImageData` → `canvas.toDataURL('image/jpeg', 0.75)` → `outPdf.embedJpg()` → `outPdf.addPage([w, h])` → `drawImage` full-bleed → `save()` → blob URL → `SuccessState`. Copy that flow verbatim; only the pixel function and controls change.
- Existing shell pieces to reuse, do NOT reimplement: `getPdfMetaData`, `loadPdfDocument`, `unlockPdf` (`src/utils/pdfHelpers.ts`), `usePipeline`/`consumePipelineFile`, `SuccessState`, `PrivacyBadge`, `NativeToolLayout`, `addActivity`, `BRAND.filePrefix`. Password gate UI: copy the Lock card from `GrayscaleTool.tsx:136-145`.
- Icons `Wand2`, `SlidersHorizontal`, `Sun`, `Moon`, `Contrast`, `FlipVertical2` confirmed present in installed `lucide-react@0.446.0`. Use `Wand2` for the tool icon.
- Category: `'Optimize'` (same as Grayscale). Route: `/appearance`. Tool title: **"PDF Appearance"**.
- **Design decisions (made — don't re-litigate):**
  - **Presets only, no sliders.** Six fixed presets, each a single pure pixel function. Sliders are YAGNI v2.
  - **Rasterization trade-off is accepted** — same as Grayscale: output pages become images (text no longer selectable). This is inherent to pixel filters and matches the existing Grayscale tool's behavior. Say so in the UI copy.
  - **Live preview**: render page 1 once per preset change at scale 0.6 (cheap, single page). Original vs filtered shown side by side.
  - JPEG quality 0.75, render scale 1.5 — identical to Grayscale (proven size/quality balance).

## Architecture / proposed approach

One new component `src/components/tools/AppearanceTool.tsx` (default export) modeled on `GrayscaleTool.tsx`, plus 4 registration edits in `src/App.tsx`. The pixel math lives in one pure exported function `applyFilterToPixels(data: Uint8ClampedArray, filter: FilterType)` — the Node harness mirrors that exact function to pin the math before the component exists (this repo's TDD substitute).

## Step-by-step tasks

### Task 1 — Spec harness first (TDD substitute)

Create `verify-appearance-ops.mjs` in the project root (so nothing needs resolving; pure math only):

```js
// verify-appearance-ops.mjs — temp harness, delete after verification
import assert from 'node:assert'

// Mirror of applyFilterToPixels (lives in src/components/tools/AppearanceTool.tsx)
function applyFilterToPixels(data, filter) {
  for (let j = 0; j < data.length; j += 4) {
    let r = data[j], g = data[j + 1], b = data[j + 2]
    if (filter === 'grayscale') {
      const avg = r * 0.299 + g * 0.587 + b * 0.114
      r = g = b = avg
    } else if (filter === 'invert') {
      r = 255 - r; g = 255 - g; b = 255 - b
    } else if (filter === 'sepia') {
      const nr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      const ng = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      const nb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
      r = nr; g = ng; b = nb
    } else if (filter === 'brighten') {
      r = Math.min(255, r + 40); g = Math.min(255, g + 40); b = Math.min(255, b + 40)
    } else if (filter === 'darken') {
      r = Math.max(0, r - 60); g = Math.max(0, g - 60); b = Math.max(0, b - 60)
    } else if (filter === 'contrast') {
      const f = 1.5
      r = Math.max(0, Math.min(255, (r - 128) * f + 128))
      g = Math.max(0, Math.min(255, (g - 128) * f + 128))
      b = Math.max(0, Math.min(255, (b - 128) * f + 128))
    }
    data[j] = r; data[j + 1] = g; data[j + 2] = b
  }
  return data
}

let passed = 0
const ok = (label, fn) => { fn(); console.log(`PASS ${label}`); passed++ }
const px = (r, g, b) => new Uint8ClampedArray([r, g, b, 255])

ok('grayscale: luminance weights', () => {
  const d = applyFilterToPixels(px(100, 150, 200), 'grayscale')
  const expected = 100 * 0.299 + 150 * 0.587 + 200 * 0.114
  assert.ok(Math.abs(d[0] - expected) < 1 && d[0] === d[1] && d[1] === d[2])
})
ok('invert: exact complement', () => {
  const d = applyFilterToPixels(px(0, 128, 255), 'invert')
  assert.strictEqual(d[0], 255); assert.strictEqual(d[1], 127); assert.strictEqual(d[2], 0)
})
ok('sepia: warm shift, clamped', () => {
  const d = applyFilterToPixels(px(255, 255, 255), 'sepia')
  assert.ok(d[0] >= d[1] && d[1] >= d[2]) // warm cast ordering
  assert.ok(d[0] <= 255)
})
ok('brighten: +40 clamped at 255', () => {
  const d = applyFilterToPixels(px(240, 10, 0), 'brighten')
  assert.strictEqual(d[0], 255); assert.strictEqual(d[1], 50); assert.strictEqual(d[2], 40)
})
ok('darken: -60 clamped at 0', () => {
  const d = applyFilterToPixels(px(10, 200, 255), 'darken')
  assert.strictEqual(d[0], 0); assert.strictEqual(d[1], 140); assert.strictEqual(d[2], 195)
})
ok('contrast: mid-gray stays, extremes push out', () => {
  const mid = applyFilterToPixels(px(128, 128, 128), 'contrast')
  assert.strictEqual(mid[0], 128)
  const dark = applyFilterToPixels(px(50, 50, 50), 'contrast')
  assert.ok(dark[0] < 50)
  const light = applyFilterToPixels(px(200, 200, 200), 'contrast')
  assert.ok(light[0] > 200)
})
ok('alpha channel never touched', () => {
  const src = px(100, 100, 100)
  for (const f of ['grayscale', 'invert', 'sepia', 'brighten', 'darken', 'contrast']) {
    const d = applyFilterToPixels(new Uint8ClampedArray(src), f)
    assert.strictEqual(d[3], 255)
  }
})
ok('unknown filter: pixels unchanged', () => {
  const d = applyFilterToPixels(px(11, 22, 33), 'original')
  assert.strictEqual(d[0], 11); assert.strictEqual(d[1], 22); assert.strictEqual(d[2], 33)
})

console.log(`\n${passed}/8 checks passed`)
```

Run:

```bash
cd /Users/zafajardo/Documents/Development/zia-pdf && node verify-appearance-ops.mjs
```

**Expected:** 8 `PASS` lines + `8/8 checks passed`, exit 0. If any check fails, fix the mirror here first — the component copies this function verbatim.

### Task 2 — Create `src/components/tools/AppearanceTool.tsx`

Start with the AGPL header (copy lines 1–9 of `src/utils/pdfHelpers.ts` verbatim), then this complete component:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Wand2, Lock, Loader2, ArrowRight, X } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { toast } from 'sonner'
import { Capacitor } from '@capacitor/core'

import { getPdfMetaData, loadPdfDocument, unlockPdf } from '../../utils/pdfHelpers'
import { addActivity } from '../../utils/recentActivity'
import { usePipeline } from '../../utils/pipelineContext'
import SuccessState from './shared/SuccessState'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

type PdfData = { file: File, thumbnail?: string, pageCount: number, isLocked: boolean, pdfDoc?: any, password?: string }
export type FilterType = 'brighten' | 'darken' | 'contrast' | 'invert' | 'sepia' | 'grayscale'

const FILTERS: { value: FilterType, label: string, hint: string }[] = [
  { value: 'brighten', label: 'Brighten', hint: 'Lift dark scans' },
  { value: 'darken', label: 'Darken', hint: 'Deeper ink tones' },
  { value: 'contrast', label: 'High Contrast', hint: 'Sharper text' },
  { value: 'invert', label: 'Invert', hint: 'Night reading' },
  { value: 'sepia', label: 'Sepia', hint: 'Warm paper look' },
  { value: 'grayscale', label: 'Grayscale', hint: 'Save ink & size' },
]

export function applyFilterToPixels(data: Uint8ClampedArray, filter: FilterType | string) {
  for (let j = 0; j < data.length; j += 4) {
    let r = data[j], g = data[j + 1], b = data[j + 2]
    if (filter === 'grayscale') {
      const avg = r * 0.299 + g * 0.587 + b * 0.114
      r = g = b = avg
    } else if (filter === 'invert') {
      r = 255 - r; g = 255 - g; b = 255 - b
    } else if (filter === 'sepia') {
      const nr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      const ng = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      const nb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
      r = nr; g = ng; b = nb
    } else if (filter === 'brighten') {
      r = Math.min(255, r + 40); g = Math.min(255, g + 40); b = Math.min(255, b + 40)
    } else if (filter === 'darken') {
      r = Math.max(0, r - 60); g = Math.max(0, g - 60); b = Math.max(0, b - 60)
    } else if (filter === 'contrast') {
      const f = 1.5
      r = Math.max(0, Math.min(255, (r - 128) * f + 128))
      g = Math.max(0, Math.min(255, (g - 128) * f + 128))
      b = Math.max(0, Math.min(255, (b - 128) * f + 128))
    }
    data[j] = r; data[j + 1] = g; data[j + 2] = b
  }
  return data
}

export default function AppearanceTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { consumePipelineFile } = usePipeline()
  const [pdfData, setPdfData] = useState<PdfData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-appearance`)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [filter, setFilter] = useState<FilterType>('brighten')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })
      handleFile(file)
    }
  }, [])

  // Live preview of page 1 with the selected filter
  useEffect(() => {
    if (!pdfData || pdfData.isLocked || !pdfData.pdfDoc || downloadUrl) return
    let cancelled = false
    const render = async () => {
      try {
        const page = await pdfData.pdfDoc.getPage(1)
        const viewport = page.getViewport({ scale: 0.6 })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport }).promise
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        applyFilterToPixels(imageData.data, filter)
        ctx.putImageData(imageData, 0, 0)
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8))
      } catch (err) { console.error(err) }
    }
    render()
    return () => { cancelled = true }
  }, [pdfData, filter, downloadUrl])

  const handleUnlock = async () => {
    if (!pdfData || !unlockPassword) return
    setIsProcessing(true)
    const result = await unlockPdf(pdfData.file, unlockPassword)
    if (result.success) {
      setPdfData({ ...pdfData, isLocked: false, pageCount: result.pageCount, pdfDoc: result.pdfDoc, thumbnail: result.thumbnail, password: unlockPassword })
      setCustomFileName(`${pdfData.file.name.replace('.pdf', '')}-appearance`)
    } else { toast.error('Incorrect password') }
    setIsProcessing(false)
  }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') return
    setIsProcessing(true)
    try {
      const meta = await getPdfMetaData(file)
      if (meta.isLocked) { setPdfData({ file, pageCount: 0, isLocked: true }) }
      else {
        const pdfDoc = await loadPdfDocument(file)
        setPdfData({ file, pageCount: meta.pageCount, isLocked: false, pdfDoc, thumbnail: meta.thumbnail })
        setCustomFileName(`${file.name.replace('.pdf', '')}-appearance`)
      }
      setDownloadUrl(null)
    } catch (err) { console.error(err) } finally { setIsProcessing(false) }
  }

  const applyFilter = async () => {
    if (!pdfData || !pdfData.pdfDoc) return
    setIsProcessing(true); setProgress(0); await new Promise(resolve => setTimeout(resolve, 100))
    try {
      const outPdf = await PDFDocument.create()
      const scale = 1.5
      for (let i = 1; i <= pdfData.pageCount; i++) {
        const page = await pdfData.pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) continue
        canvas.height = viewport.height
        canvas.width = viewport.width
        await page.render({ canvasContext: ctx, viewport }).promise
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        applyFilterToPixels(imageData.data, filter)
        ctx.putImageData(imageData, 0, 0)
        const imgData = canvas.toDataURL('image/jpeg', 0.75)
        const img = await outPdf.embedJpg(imgData)
        const newPage = outPdf.addPage([viewport.width, viewport.height])
        newPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height })
        canvas.width = 0; canvas.height = 0
        setProgress(Math.round((i / pdfData.pageCount) * 100))
      }
      const pdfBytes = await outPdf.save()
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'PDF Appearance', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const ActionButton = () => (
    <button onClick={applyFilter} disabled={isProcessing} className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20 ${isNative ? 'py-4 rounded-lg text-sm' : 'p-6 rounded-xl text-xl'}`}>
      {isProcessing ? <><Loader2 className="animate-spin" /> {progress}%</> : <><Wand2 size={18} /> Apply {FILTERS.find(f => f.value === filter)?.label} <ArrowRight size={18} /></>}
    </button>
  )

  return (
    <NativeToolLayout title="PDF Appearance" description="Change the look of your document — brighten, invert, sepia, and more." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButton />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Wand2 size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to restyle your document</p>
        </div>
      ) : pdfData.isLocked ? (
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={32} /></div>
            <h3 className="text-2xl font-bold mb-2 dark:text-white">Protected File</h3>
            <input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-50 dark:bg-black rounded-lg px-6 py-4 border border-transparent focus:border-blue-500 outline-none font-bold text-center mb-4 dark:text-white" />
            <button onClick={handleUnlock} disabled={!unlockPassword || isProcessing} className="w-full bg-blue-500 text-white p-4 rounded-lg font-semibold uppercase text-xs">Unlock</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-white/5 flex items-center gap-6">
            <div className="w-16 h-20 bg-gray-50 dark:bg-black rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-blue-500">{pdfData.thumbnail ? <img src={pdfData.thumbnail} className="w-full h-full object-cover" /> : <Wand2 size={20} />}</div>
            <div className="flex-1 min-w-0"><h3 className="font-bold text-sm truncate dark:text-white">{pdfData.file.name}</h3><p className="text-[10px] text-gray-400 uppercase font-semibold">{pdfData.pageCount} Pages • {(pdfData.file.size / (1024 * 1024)).toFixed(1)} MB</p></div>
            <button onClick={() => setPdfData(null)} className="p-2 text-gray-400 hover:text-blue-500"><X size={20} /></button>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-white/5 space-y-8 shadow-sm">
            {!downloadUrl ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {FILTERS.map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value)} className={`p-4 rounded-lg border-2 transition-all flex flex-col items-start text-left ${filter === f.value ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-zinc-700'}`}>
                      <span className={`font-semibold uppercase text-[10px] tracking-widest ${filter === f.value ? 'text-blue-500' : 'text-gray-700 dark:text-zinc-300'}`}>{f.label}</span>
                      <span className="text-[9px] text-gray-400 mt-1">{f.hint}</span>
                    </button>
                  ))}
                </div>

                {previewUrl && !isProcessing && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 text-center">Original</p>
                      {pdfData.thumbnail && <img src={pdfData.thumbnail} alt="Original page" className="w-full rounded-lg border border-gray-100 dark:border-white/5" />}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 text-center">{FILTERS.find(f => f.value === filter)?.label}</p>
                      <img src={previewUrl} alt="Filtered preview" className="w-full rounded-lg border border-blue-100 dark:border-blue-900/30" />
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-3">
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                      <div className="bg-blue-500 h-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-center font-semibold text-gray-400 uppercase tracking-widest animate-pulse">Applying filter to all pages...</p>
                  </div>
                )}

                {!isProcessing && (
                  <>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest text-center leading-relaxed">Note: Filters rasterize pages — text remains visible but is no longer selectable.</p>
                    </div>
                    <div><label className="block text-[10px] font-semibold uppercase text-gray-400 mb-3 tracking-widest px-1">Output Filename</label><input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white" /></div>
                  </>
                )}
              </>
            ) : (
              <SuccessState message="Appearance Updated!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setDownloadUrl(null); setProgress(0); setPreviewUrl(null); setPdfData(null) }} />
            )}
            <button onClick={() => setPdfData(null)} className="w-full py-2 text-[10px] font-semibold uppercase text-gray-300 hover:text-blue-500 transition-colors">Close File</button>
          </div>
        </div>
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
```

**Watch-outs baked into this code (don't "simplify" them away):**
- `e.target.value = ''` in the file input onChange — required so re-selecting the same file re-fires.
- The preview `useEffect` has a `cancelled` flag — pdfjs rendering is async and the filter can change mid-render; without it you get stale-preview races.
- `canvas.width = 0; canvas.height = 0` after each full-page render — memory cleanup on large docs (same as GrayscaleTool pattern).
- `applyFilterToPixels` must be byte-for-byte identical to the harness mirror.
- All imports are used; eslint runs `--max-warnings 0`.

### Task 3 — Register in `src/App.tsx` (exactly 4 edits)

1. **Icon import** — append `Wand2` to the lucide import block (line ~16, currently ends `...FileArchive, Eraser, FileSearch`).
2. **Static component import** — after the `PdfInspectorTool` import:
   ```
   import AppearanceTool from './components/tools/AppearanceTool'
   ```
3. **`tools[]` entry** — after the PDF Inspector entry:
   ```
   { title: 'PDF Appearance', desc: 'Change the look of your document — brighten, invert, sepia, and more.', icon: Wand2, implemented: true, path: '/appearance', category: 'Optimize', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
   ```
4. **Route** — after the `/pdf-inspector` route:
   ```
   <Route path="/appearance" element={<AppearanceTool />} />
   ```

Static imports only — lazy imports break the APK.

### Task 4 — Housekeeping

Add to `TOOL_IDEAS.md` section 1 (Zero-cost wins) table, marked done since it uses only existing deps:

```
| **✅ PDF Appearance** | Brighten / darken / invert / sepia / contrast / grayscale filters | pdfjs + pdf-lib (installed) | 🟡 |
```

### Task 5 — Verify

Run in order from `/Users/zafajardo/Documents/Development/zia-pdf`:

```bash
node verify-appearance-ops.mjs   # expected: 8 PASS + "8/8 checks passed"
npm run build                    # expected: exit 0
npm run lint                     # expected: exit 0, no output after the eslint banner
```

Then delete the harness: `rm verify-appearance-ops.mjs`.

**Manual smoke** (dev server may already be running on 5173/5174 — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` first, else `npm run dev`): open `/#/appearance` → load a PDF → click through all 6 presets, confirm preview updates → Apply → download. Use the Chameleon toggle (bottom-right, dev only) to check the Android layout.

### Task 6 — Commits (repo convention)

```bash
git add src/components/tools/AppearanceTool.tsx
git commit -m "feat: add PDF Appearance tool"

git add src/App.tsx TOOL_IDEAS.md
git add -f dist/index.html   # force-tracked; include only if build changed it (check git status)
git commit -m "feat: register PDF Appearance tool"
```

Note: `dist/index.html` is force-tracked and `npm run build` regenerates it — add it with `-f` to the registration commit only if `git status` shows it modified. Commit nothing else from `dist/`.

## Tests / validation

No test runner in this repo. Validation cycle:
1. **Harness first (Task 1)** — 8 assertions pin the pixel math (grayscale weights, invert complement, sepia warmth order, brightness/darken clamping, contrast push-out, alpha untouched, no-op for unknown filters).
2. **Type + lint gates (Task 5)** — `npm run build` + `npm run lint`.
3. **Manual smoke** — preview changes per preset, output downloads and opens.

## Risks, tradeoffs, open questions

- **Rasterization** (accepted, surfaced in UI): pages become JPEG images at 1.5× scale. Text no longer selectable; file size may grow for text-heavy docs. Identical trade-off to the shipped Grayscale tool, so it's consistent product behavior.
- **Memory on huge docs**: each page is rendered at 1.5× before embed; 100+ page docs will be slow/heavy. Same as Grayscale; per-page canvas cleanup mitigates.
- **Preview scale (0.6)** is intentionally lower than output scale (1.5) for responsiveness — preview is indicative, not exact.
- **Invert + JPEG**: inverted pages get white borders on any page margin; acceptable (Grayscale has the same edge behavior).
- **No brightness/contrast sliders in v1** — presets keep the math testable and the UI predictable. Sliders are a natural v2 if users ask.
- **Pipeline handoff works automatically** via `consumePipelineFile` — a PDF finished in another tool flows in here.
