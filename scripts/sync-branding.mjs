import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const brand = JSON.parse(await readFile(resolve(root, 'brand.config.json'), 'utf8'))
const { logo } = brand
const sourceLogo = await readFile(resolve(root, logo.source))

// Remove only light, neutral pixels connected to the outer edge. This clears
// the checkerboard baked into the supplied artwork without removing the white
// wrench enclosed by the blue badge.
const renderedLogo = await sharp(sourceLogo)
  .resize(1024, 1024, { fit: 'contain' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { data: logoPixels, info: logoInfo } = renderedLogo
const visited = new Uint8Array(logoInfo.width * logoInfo.height)
const queue = new Int32Array(logoInfo.width * logoInfo.height)
let queueStart = 0
let queueEnd = 0
const isBackground = (position) => {
  const offset = position * 4
  const red = logoPixels[offset]
  const green = logoPixels[offset + 1]
  const blue = logoPixels[offset + 2]
  const alpha = logoPixels[offset + 3]
  return alpha > 0 && Math.min(red, green, blue) >= 205 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 38
}
const enqueue = (position) => {
  if (!visited[position] && isBackground(position)) {
    visited[position] = 1
    queue[queueEnd++] = position
  }
}
for (let x = 0; x < logoInfo.width; x++) {
  enqueue(x)
  enqueue((logoInfo.height - 1) * logoInfo.width + x)
}
for (let y = 0; y < logoInfo.height; y++) {
  enqueue(y * logoInfo.width)
  enqueue(y * logoInfo.width + logoInfo.width - 1)
}
while (queueStart < queueEnd) {
  const position = queue[queueStart++]
  const x = position % logoInfo.width
  const y = Math.floor(position / logoInfo.width)
  logoPixels[position * 4 + 3] = 0
  if (x > 0) enqueue(position - 1)
  if (x + 1 < logoInfo.width) enqueue(position + 1)
  if (y > 0) enqueue(position - logoInfo.width)
  if (y + 1 < logoInfo.height) enqueue(position + logoInfo.width)
}
for (let seed = 0; seed < visited.length; seed++) {
  if (visited[seed] || !isBackground(seed)) continue
  queueStart = 0
  queueEnd = 0
  visited[seed] = 1
  queue[queueEnd++] = seed
  while (queueStart < queueEnd) {
    const position = queue[queueStart++]
    const x = position % logoInfo.width
    const y = Math.floor(position / logoInfo.width)
    if (x > 0) enqueue(position - 1)
    if (x + 1 < logoInfo.width) enqueue(position + 1)
    if (y > 0) enqueue(position - logoInfo.width)
    if (y + 1 < logoInfo.height) enqueue(position + logoInfo.width)
  }
  if (queueEnd < 3000) {
    for (let index = 0; index < queueEnd; index++) logoPixels[queue[index] * 4 + 3] = 0
  }
}
const cleanLogo = await sharp(logoPixels, { raw: logoInfo }).png().toBuffer()

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

await writeFile(resolve(root, 'public/icons/logo.svg'), sourceLogo)
await writeFile(resolve(root, 'public/icons/logo.png'), cleanLogo)

const adaptiveSize = 432
const adaptiveLogoSize = 344
const adaptiveLogo = await sharp(cleanLogo)
  .resize(adaptiveLogoSize, adaptiveLogoSize, { fit: 'contain' })
  .png()
  .toBuffer()
const adaptiveForeground = await sharp({
  create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: adaptiveLogo, left: 44, top: 44 }])
  .png()
  .toBuffer()
const adaptiveMonochrome = await sharp(adaptiveForeground)
  .greyscale()
  .threshold(1)
  .tint('#000000')
  .png()
  .toBuffer()

const drawableTarget = resolve(root, 'android/app/src/main/res/drawable-nodpi')
await mkdir(drawableTarget, { recursive: true })
await writeFile(resolve(drawableTarget, 'ic_brand_foreground.png'), adaptiveForeground)
await writeFile(resolve(drawableTarget, 'ic_brand_monochrome.png'), adaptiveMonochrome)
await writeFile(resolve(root, 'android/app/src/main/res/values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${logo.launcherBackground}</color>\n</resources>\n`)

await writeFile(resolve(root, 'android/app/src/main/res/values/strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapeXml(brand.name)}</string>
    <string name="title_activity_main">${escapeXml(brand.name)}</string>
    <string name="package_name">${escapeXml(brand.appId)}</string>
    <string name="custom_url_scheme">${escapeXml(brand.appId)}</string>
</resources>
`)

const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
for (const [density, size] of Object.entries(densities)) {
  const target = resolve(root, `android/app/src/main/res/mipmap-${density}`)
  const inset = Math.round(size * 0.1)
  const icon = await sharp(cleanLogo).resize(size - inset * 2, size - inset * 2, { fit: 'contain' }).png().toBuffer()
  const launcher = await sharp({ create: { width: size, height: size, channels: 4, background: logo.launcherBackground } })
    .composite([{ input: icon, left: inset, top: inset }])
    .png()
    .toBuffer()
  const circleMask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`)
  await writeFile(resolve(target, 'ic_launcher.png'), launcher)
  await sharp(launcher).composite([{ input: circleMask, blend: 'dest-in' }]).png().toFile(resolve(target, 'ic_launcher_round.png'))
  await sharp(cleanLogo).resize(size, size, { fit: 'contain' }).png().toFile(resolve(target, 'ic_launcher_foreground.png'))
}

await writeFile(resolve(root, 'fastlane/metadata/android/en-US/title.txt'), `${brand.name}: ${brand.tagline}\n`)

const gradlePath = resolve(root, 'android/app/build.gradle')
const gradle = await readFile(gradlePath, 'utf8')
await writeFile(gradlePath, gradle
  .replace(/namespace "[^"]+"/, `namespace "${brand.appId}"`)
  .replace(/applicationId "[^"]+"/, `applicationId "${brand.appId}"`))

console.log(`Branding synced for ${brand.name}`)
