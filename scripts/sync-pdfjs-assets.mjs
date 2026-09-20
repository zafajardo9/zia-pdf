import { access, copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// PDF.js fetches these at runtime from the URLs configured in
// `src/utils/pdfHelpers.ts`, so they have to be served as static files. They
// ship inside node_modules and are versioned with pdfjs-dist, so they are
// copied fresh on every sync.
//
// - `wasm/`         OpenJPEG (JPX images) and qcms (ICC colour profiles)
// - `standard_fonts/` Base-14 font substitutes for the standard fonts that PDFs
//                     commonly reference without embedding
const sources = [
  ['node_modules/pdfjs-dist/wasm', 'public/wasm'],
  ['node_modules/pdfjs-dist/standard_fonts', 'public/standard_fonts'],
]

for (const [from, to] of sources) {
  const source = resolve(root, from)
  const target = resolve(root, to)

  try {
    await access(source)
  } catch {
    console.error(`Missing ${from}. Run "npm install" first.`)
    process.exit(1)
  }

  await mkdir(target, { recursive: true })

  const entries = await readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    await copyFile(resolve(source, entry.name), resolve(target, entry.name))
  }

  console.log(`Copied ${entries.length} files from ${from} to ${to}`)
}

console.log('PDF.js assets synced')
