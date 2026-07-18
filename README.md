# Zia-PDF

**A privacy-first PDF utility that runs entirely on your device — no uploads, no servers, no tracking.**

---

## Goals

- **100% Local Processing.** Every operation happens in the browser or on-device. Files never leave your memory, are never uploaded to any server, and are never stored in any database.
- **Offline-First.** Works without an internet connection. No network requests, no telemetry, no analytics.
- **Privacy by Design.** No accounts, no sign-ups, no data collection. Your documents remain yours alone.
- **Cross-Platform.** Available as a web app (PWA) and a native Android app from a single codebase.
- **Open & Transparent.** Licensed under AGPL v3 to ensure the code stays open forever. No hidden functionality, no trackers, no ads.

---

## Features

### Modify
- **Merge** — Combine multiple PDFs into a single file.
- **Split** — Extract specific pages or split by page ranges.
- **Rotate** — Rotate individual or all pages in 90° increments.
- **Rearrange** — Drag-and-drop to reorder, add, or remove pages.

### Optimize
- **Compress** — Reduce file size with multiple quality presets (low, medium, high).
- **Resize** — Adjust page dimensions while preserving content.

### Secure
- **Encrypt** — Password-protect PDFs with user and owner passwords.
- **Decrypt** — Remove password protection from encrypted files (locally).

### Convert
- **PDF to Image** — Export pages as JPG or PNG at configurable resolutions.
- **PDF to Text** — Extract readable text using OCR via Tesseract.js.
- **Images to PDF** — Combine multiple images into a single PDF.

### Sign
- **Electronic Signature** — Add drawn, typed, or uploaded signatures directly onto documents.

### Sanitize
- **Metadata Cleaner** — Strip author, producer, creator, and other hidden metadata to keep files anonymous.
- **Redact** — Permanently remove sensitive content from pages.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Rendering & Manipulation | pdf-lib, pdfjs-dist (WebAssembly) |
| OCR | Tesseract.js |
| Routing | React Router |
| Drag & Drop | dnd-kit |
| Mobile (Android) | Capacitor |
| Build Tooling | Vite + PWA plugin |

---

## Change the App Name and Logo

All brand settings live in [`brand.config.json`](brand.config.json). The master logo artwork is [`assets/new-logo.svg`](assets/new-logo.svg), referenced by the `logo.source` field.

Change the name, tagline, URLs, application ID, file prefix, or logo source there. To replace the artwork, overwrite the single SVG referenced by `logo.source`. Then run:

```bash
npm run brand:sync
```

The sync is also automatic before `npm run dev` and `npm run build`. It updates the UI logo and name, browser favicon and metadata, PWA manifest, sharing text, default output filenames, Capacitor name, Android labels, adaptive icons, legacy launcher PNGs, and Play Store title.

Changing `appId` changes the Android application identity. Keep it unchanged when updating an existing published app.

---

## License

GNU Affero General Public License v3.0 (AGPL-3.0)
