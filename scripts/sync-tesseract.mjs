import { access, copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targetDir = resolve(root, 'public/tesseract')

const lang = 'eng'
const langDataVersion = '4.0.0_best_int'
const langDataUrl = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/${langDataVersion}/${lang}.traineddata.gz`
const langDataPath = resolve(targetDir, `${lang}.traineddata.gz`)

// The worker and core are shipped inside node_modules, so they are copied fresh
// on every sync. The core `.wasm.js` file embeds its WASM binary as base64, so no
// separate `.wasm` file is required.
const sources = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core.wasm.js', 'tesseract-core.wasm.js'],
]

await mkdir(targetDir, { recursive: true })

for (const [from, name] of sources) {
  const source = resolve(root, from)
  try {
    await access(source)
  } catch {
    console.error(`Missing ${from}. Run "npm install" first.`)
    process.exit(1)
  }
  await copyFile(source, resolve(targetDir, name))
  console.log(`Copied ${name}`)
}

// Language data is not bundled in node_modules and is large (~11 MB), so it is
// downloaded once and committed to the repo. It is skipped when already present
// so local builds and CI don't re-download on every run.
let needsDownload = true
try {
  const existing = await stat(langDataPath)
  if (existing.size > 1024 * 1024) {
    needsDownload = false
    console.log(`Skipped ${lang}.traineddata.gz (already present)`)
  }
} catch {
  needsDownload = true
}

if (needsDownload) {
  console.log(`Downloading ${lang}.traineddata.gz...`)
  const response = await fetch(langDataUrl)
  if (!response.ok) {
    console.error(`Failed to download ${langDataUrl}: ${response.status} ${response.statusText}`)
    process.exit(1)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(langDataPath, buffer)
  console.log(`Downloaded ${lang}.traineddata.gz (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
}

console.log('Tesseract assets synced')
