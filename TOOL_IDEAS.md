# Zia-PDF — Tool Ideas Beyond PDF

> Brainstorm list: tools that fit the 100% client-side, privacy-first architecture
> (React + pdf-lib + pdfjs + jszip + tesseract.js + Capacitor).
> No servers, no uploads — everything runs in the browser/APK.

## Legend

- **Effort**: 🟢 small (dep exists / well-trodden API) · 🟡 medium · 🔴 large
- **APK note**: anything heavy should lazy-load its WASM/bundle on demand, never ship inside the base APK

---

## 1. Zero-cost wins — dependency already in package.json

| Tool | What it does | Dep | Effort |
|---|---|---|---|
| **✅ ZIP / UnZIP** | Create zips, browse archive contents, extract selected files | `jszip` (installed) | 🟢 |
| **OCR Image → Text** | Upload a photo/scan, get copyable or downloadable text | `tesseract.js` (bundled in `/public`) | 🟢 |
| **Searchable PDF (OCR)** | Turn scanned PDFs into real PDFs with an invisible text layer | tesseract.js + pdf-lib text drawing | 🔴 |
| **Form Filler** | Fill AcroForm fields (text, checkbox, dropdown), flatten result | pdf-lib AcroForm API | 🟡 |

## 2. Privacy tools — fits the brand story (Metadata tool, auto-wipe)

| Tool | What it does | Dep | Effort |
|---|---|---|---|
| **EXIF Remover** | Strip GPS/camera/serial metadata from photos | Canvas re-encode or `exifr` (read) | 🟢 |
| **Redact PDF** | Black out regions AND remove underlying content stream — real redaction | pdf-lib | 🟡 |
| **File Hasher** | SHA-256 / MD5 checksums to verify downloads | Web Crypto API | 🟢 |
| **Password Generator** | Strong passphrase/password generation | Pure JS | 🟢 |

## 3. Everyday utility

| Tool | What it does | Dep | Effort |
|---|---|---|---|
| **QR Generator** | Links, Wi-Fi, vCard → PNG/SVG QR | `qrcode` | 🟢 |
| **QR Scanner** | Decode QR from camera or uploaded image | `jsqr` | 🟢 |
| **Markdown → PDF** | Write/preview markdown, export styled PDF | `marked` + pdf-lib or canvas | 🟡 |
| **CSV ⇄ JSON ⇄ Excel** | Convert spreadsheets between formats | `xlsx` (SheetJS) | 🟢 |
| **Word → PDF/Text** | Read `.docx`, export text or simple PDF | `mammoth` | 🟡 |
| **Text Tools** | Word counter, case converter, diff checker, find & replace | Pure JS | 🟢 |

## 4. Heavy hitters — lazy-load the WASM

| Tool | What it does | Dep | Effort |
|---|---|---|---|
| **Document Scanner** | Camera capture → edge detect → perspective straighten → PDF | Canvas math + existing camera | 🔴 |
| **Video/Audio suite** | Compress video, trim audio, video → GIF, extract audio | `ffmpeg.wasm` (~30 MB, download-on-demand) | 🔴 |

---

## Recommended starting three

1. **ZIP tools** — dependency already paid for, immediate value
2. **EXIF Remover** — perfect brand fit, small build
3. **Document Scanner** — the APK differentiator (feels like a real product, not a webview)

## Registration notes (when implementing)

- Each tool = `src/components/tools/<Name>Tool.tsx` + 4 edits in `src/App.tsx` (static imports only — lazy imports break the APK)
- New files need the AGPL header block (copy from `src/utils/pdfHelpers.ts` lines 1–9)
- Verify with `npm run build` + `npm run lint` + a Node functional harness (no test runner in repo)
