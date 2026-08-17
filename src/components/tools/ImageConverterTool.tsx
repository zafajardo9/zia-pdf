import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Download, ImageDown, Link, Link2Off, Loader2, Plus, RotateCcw, Share2, Trash2, Upload } from 'lucide-react'
import JSZip from 'jszip'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'

import { BRAND } from '../../config/brand'
import { addActivity } from '../../utils/recentActivity'
import { downloadFile, shareFile } from '../../utils/pdfHelpers'
import { hapticSuccess } from '../../utils/haptics'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'

type OutputFormat = 'webp' | 'jpeg' | 'png'
type ResizeMode = 'original' | 'long-edge' | 'custom'
type ImageItem = { id: string; file: File; preview: string; width?: number; height?: number }
type ConversionResult = { url: string; bytes: Uint8Array; fileName: string; mimeType: string; previewUrl?: string; count: number; width?: number; height?: number }
type ResizeSettings = { mode: ResizeMode; maxDimension: number; width: number; height: number; preserveAspect: boolean; allowUpscale: boolean }

const outputOptions: { value: OutputFormat; label: string; detail: string }[] = [
  { value: 'webp', label: 'WebP', detail: 'Smallest modern format' },
  { value: 'jpeg', label: 'JPG', detail: 'Best compatibility' },
  { value: 'png', label: 'PNG', detail: 'Lossless + transparency' },
]

const longEdgeOptions = [
  { value: 2048, label: '2048 px' },
  { value: 1280, label: '1280 px' },
  { value: 800, label: '800 px' },
]

const extensionFor = (format: OutputFormat) => format === 'jpeg' ? 'jpg' : format
const mimeFor = (format: OutputFormat) => `image/${format}`
const baseName = (name: string) => name.replace(/\.[^.]+$/, '')

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(`Your device cannot create ${mimeType.replace('image/', '').toUpperCase()} images.`)), mimeType, quality)
  })
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } catch {
    URL.revokeObjectURL(url)
    throw new Error(`${file.name} could not be read as an image.`)
  }
}

function outputDimensions(imageWidth: number, imageHeight: number, settings: ResizeSettings) {
  if (settings.mode === 'original') return { width: imageWidth, height: imageHeight }

  if (settings.mode === 'long-edge') {
    let scale = settings.maxDimension / Math.max(imageWidth, imageHeight)
    if (!settings.allowUpscale) scale = Math.min(1, scale)
    return { width: Math.max(1, Math.round(imageWidth * scale)), height: Math.max(1, Math.round(imageHeight * scale)) }
  }

  if (!settings.preserveAspect) {
    return {
      width: Math.max(1, Math.round(settings.allowUpscale ? settings.width : Math.min(imageWidth, settings.width))),
      height: Math.max(1, Math.round(settings.allowUpscale ? settings.height : Math.min(imageHeight, settings.height))),
    }
  }

  let scale = Math.min(settings.width / imageWidth, settings.height / imageHeight)
  if (!settings.allowUpscale) scale = Math.min(1, scale)
  return { width: Math.max(1, Math.round(imageWidth * scale)), height: Math.max(1, Math.round(imageHeight * scale)) }
}

async function convertImage(file: File, format: OutputFormat, quality: number, resize: ResizeSettings) {
  const image = await loadImage(file)
  try {
    const { width, height } = outputDimensions(image.naturalWidth, image.naturalHeight, resize)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: format !== 'jpeg' })
    if (!context) throw new Error('Image conversion is unavailable on this device.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (format === 'jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
    }
    context.drawImage(image, 0, 0, width, height)
    const blob = await canvasToBlob(canvas, mimeFor(format), format === 'png' ? undefined : quality / 100)
    return { blob, width, height }
  } finally {
    URL.revokeObjectURL(image.src)
  }
}

export default function ImageConverterTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef(new Set<string>())
  const [images, setImages] = useState<ImageItem[]>([])
  const [format, setFormat] = useState<OutputFormat>('webp')
  const [quality, setQuality] = useState(82)
  const [resizeMode, setResizeMode] = useState<ResizeMode>('original')
  const [maxDimension, setMaxDimension] = useState(2048)
  const [customWidth, setCustomWidth] = useState('1920')
  const [customHeight, setCustomHeight] = useState('1080')
  const [preserveAspect, setPreserveAspect] = useState(true)
  const [allowUpscale, setAllowUpscale] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const isNative = Capacitor.isNativePlatform()
  const referenceImage = images[0]
  const customWidthNumber = Number(customWidth)
  const customHeightNumber = Number(customHeight)
  const customDimensionsValid = resizeMode !== 'custom' || (
    Number.isInteger(customWidthNumber) && customWidthNumber >= 1 && customWidthNumber <= 12000 &&
    Number.isInteger(customHeightNumber) && customHeightNumber >= 1 && customHeightNumber <= 12000
  )

  useEffect(() => () => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    objectUrlsRef.current.clear()
  }, [])

  const makeObjectUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    objectUrlsRef.current.add(url)
    return url
  }

  const revokeObjectUrl = (url: string) => {
    URL.revokeObjectURL(url)
    objectUrlsRef.current.delete(url)
  }

  const clearResult = () => {
    if (result) revokeObjectUrl(result.url)
    setResult(null)
  }

  const handleFiles = (selectedFiles: FileList | File[]) => {
    const valid = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'))
    if (!valid.length) {
      toast.error('Choose a JPG, PNG, WebP, GIF, or BMP image.')
      return
    }
    clearResult()
    setImages(current => [...current, ...valid.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: makeObjectUrl(file),
    }))])
  }

  const removeImage = (id: string) => {
    setImages(current => {
      const target = current.find(image => image.id === id)
      if (target) revokeObjectUrl(target.preview)
      return current.filter(image => image.id !== id)
    })
  }

  const recordDimensions = (id: string, width: number, height: number) => {
    setImages(current => current.map(image => image.id === id && (!image.width || !image.height) ? { ...image, width, height } : image))
  }

  const selectResizeMode = (mode: ResizeMode) => {
    setResizeMode(mode)
    if (mode === 'custom' && referenceImage?.width && referenceImage.height) {
      setCustomWidth(String(referenceImage.width))
      setCustomHeight(String(referenceImage.height))
    }
  }

  const changeCustomWidth = (value: string) => {
    setCustomWidth(value)
    const width = Number(value)
    if (preserveAspect && referenceImage?.width && referenceImage.height && width > 0) {
      setCustomHeight(String(Math.max(1, Math.round(width * referenceImage.height / referenceImage.width))))
    }
  }

  const changeCustomHeight = (value: string) => {
    setCustomHeight(value)
    const height = Number(value)
    if (preserveAspect && referenceImage?.width && referenceImage.height && height > 0) {
      setCustomWidth(String(Math.max(1, Math.round(height * referenceImage.width / referenceImage.height))))
    }
  }

  const toggleAspectRatio = () => {
    const next = !preserveAspect
    setPreserveAspect(next)
    if (next && referenceImage?.width && referenceImage.height && customWidthNumber > 0) {
      setCustomHeight(String(Math.max(1, Math.round(customWidthNumber * referenceImage.height / referenceImage.width))))
    }
  }

  const reset = () => {
    images.forEach(image => revokeObjectUrl(image.preview))
    if (result) revokeObjectUrl(result.url)
    setImages([])
    setResult(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const convert = async () => {
    if (!images.length || !customDimensionsValid) return
    setIsProcessing(true)
    setProgress(0)
    clearResult()
    try {
      const converted: { blob: Blob; fileName: string; width: number; height: number }[] = []
      const resize: ResizeSettings = {
        mode: resizeMode,
        maxDimension,
        width: customWidthNumber,
        height: customHeightNumber,
        preserveAspect,
        allowUpscale,
      }
      for (let index = 0; index < images.length; index += 1) {
        const item = images[index]
        const convertedImage = await convertImage(item.file, format, quality, resize)
        converted.push({ ...convertedImage, fileName: `${baseName(item.file.name)}.${extensionFor(format)}` })
        setProgress(Math.round(((index + 1) / images.length) * 100))
      }

      let blob: Blob
      let fileName: string
      let mimeType: string
      let previewUrl: string | undefined
      if (converted.length === 1) {
        blob = converted[0].blob
        fileName = converted[0].fileName
        mimeType = mimeFor(format)
        previewUrl = makeObjectUrl(blob)
      } else {
        const zip = new JSZip()
        converted.forEach(file => zip.file(file.fileName, file.blob))
        blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        fileName = `${BRAND.filePrefix}-converted-images.zip`
        mimeType = 'application/zip'
      }
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const url = previewUrl || makeObjectUrl(blob)
      setResult({ url, bytes, fileName, mimeType, previewUrl, count: converted.length, width: converted.length === 1 ? converted[0].width : undefined, height: converted.length === 1 ? converted[0].height : undefined })
      await addActivity({ name: fileName, tool: 'Image Converter', size: blob.size, resultUrl: url })
      await hapticSuccess()
      toast.success(converted.length === 1 ? 'Image converted' : `${converted.length} images converted`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image conversion failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const saveResult = async () => {
    if (!result) return
    try {
      toast.loading(`Saving ${result.fileName}...`, { id: 'image-save' })
      await downloadFile(result.bytes, result.fileName, result.mimeType)
      toast.success(isNative ? 'Saved to Documents' : 'Download started', { id: 'image-save' })
    } catch {
      toast.error('Could not save the converted file.', { id: 'image-save' })
    }
  }

  const shareResult = async () => {
    if (!result) return
    try {
      await shareFile(result.bytes, result.fileName, result.mimeType)
    } catch {
      toast.error('Could not share the converted file.')
    }
  }

  const ActionButton = () => (
    <button onClick={convert} disabled={isProcessing || images.length === 0 || !customDimensionsValid} className="system-button-primary flex w-full items-center justify-center gap-2">
      {isProcessing ? <><Loader2 className="animate-spin" size={18} /> Converting {progress}%</> : <>Convert {images.length > 1 ? `${images.length} images` : 'image'} <ArrowRight size={18} /></>}
    </button>
  )

  return (
    <NativeToolLayout title="Image Converter" description="Change image formats, resize dimensions, and reduce file size — entirely on your device." actions={isNative && images.length > 0 && !result ? <ActionButton /> : undefined}>
      <input ref={fileInputRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" onChange={event => event.target.files && handleFiles(event.target.files)} />

      {images.length === 0 ? (
        <button onClick={() => fileInputRef.current?.click()} className="group flex min-h-72 w-full flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface px-6 text-center hover:border-accent hover:bg-[var(--accent-soft)]">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-panel border border-line bg-canvas text-accent group-hover:border-accent/30"><Upload size={26} /></span>
          <span className="text-lg font-semibold">Choose images</span>
          <span className="mt-2 max-w-sm text-sm leading-6 text-muted">Drop in JPG, PNG, WebP, GIF, or BMP files. Add one image or convert a whole batch.</span>
        </button>
      ) : result ? (
        <div className="mx-auto max-w-xl space-y-5">
          <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
            <div className="flex items-center gap-3 text-sm font-semibold"><CheckCircle2 size={18} /> {result.count === 1 ? 'Your image is ready' : `${result.count} images are ready`}</div>
          </div>
          {result.previewUrl && <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-panel border border-line bg-[linear-gradient(45deg,var(--bg-hover)_25%,transparent_25%),linear-gradient(-45deg,var(--bg-hover)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--bg-hover)_75%),linear-gradient(-45deg,transparent_75%,var(--bg-hover)_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-4"><img src={result.previewUrl} alt="Converted image preview" className="max-h-[55vh] max-w-full rounded-ui object-contain shadow-ambient" /></div>}
          <div className="rounded-ui border border-line bg-surface px-4 py-3">
            <p className="truncate text-sm font-semibold">{result.fileName}</p>
            <p className="mt-1 text-xs text-muted">{result.width && result.height ? `${result.width} × ${result.height} px · ` : ''}{(result.bytes.byteLength / 1024).toFixed(result.bytes.byteLength > 1024 * 1024 ? 0 : 1)} KB</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={shareResult} className="flex min-h-11 items-center justify-center gap-2 rounded-ui border border-line bg-surface px-4 text-sm font-semibold hover:bg-hover"><Share2 size={18} /> Share</button>
            <button onClick={saveResult} className="system-button-primary flex items-center justify-center gap-2"><Download size={18} /> {isNative ? 'Save' : 'Download'}</button>
          </div>
          <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-ui px-4 py-3 text-xs font-semibold text-muted hover:bg-hover hover:text-accent"><RotateCcw size={14} /> Convert more images</button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="system-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div><p className="text-sm font-semibold">Selected images</p><p className="mt-0.5 text-xs text-muted">{images.length} {images.length === 1 ? 'file' : 'files'}</p></div>
              <button onClick={reset} className="rounded-ui p-2 text-muted hover:bg-hover hover:text-red-500" aria-label="Clear all images"><Trash2 size={17} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              {images.map(image => (
                <div key={image.id} className="group relative overflow-hidden rounded-ui border border-line bg-canvas">
                  <img src={image.preview} alt="" className="aspect-square w-full object-cover" onLoad={event => recordDimensions(image.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
                  <div className="border-t border-line bg-surface px-2.5 py-2"><p className="truncate text-[11px] font-semibold">{image.file.name}</p><p className="mt-0.5 text-[10px] text-muted">{image.width && image.height ? `${image.width} × ${image.height} · ` : ''}{(image.file.size / 1024).toFixed(0)} KB</p></div>
                  <button onClick={() => removeImage(image.id)} aria-label={`Remove ${image.file.name}`} className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-ui border border-dashed border-line text-muted hover:border-accent hover:bg-[var(--accent-soft)] hover:text-accent"><Plus size={22} /><span className="mt-2 text-xs font-semibold">Add more</span></button>
            </div>
          </section>

          <aside className="system-surface h-fit p-5">
            <div className="mb-5 flex items-center gap-2"><ImageDown size={18} className="text-accent" /><h2 className="text-sm font-semibold">Output settings</h2></div>
            <fieldset>
              <legend className="system-label mb-2">Format</legend>
              <div className="space-y-2">
                {outputOptions.map(option => <button key={option.value} onClick={() => setFormat(option.value)} aria-pressed={format === option.value} className={`flex w-full items-center justify-between rounded-ui border p-3 text-left ${format === option.value ? 'border-accent bg-[var(--accent-soft)]' : 'border-line bg-canvas hover:bg-hover'}`}><span><span className="block text-xs font-semibold">{option.label}</span><span className="mt-0.5 block text-[10px] text-muted">{option.detail}</span></span>{format === option.value && <CheckCircle2 size={16} className="text-accent" />}</button>)}
              </div>
            </fieldset>
            {format !== 'png' && <label className="mt-5 block"><span className="mb-2 flex items-center justify-between"><span className="system-label">Quality</span><span className="text-xs font-semibold text-accent">{quality}%</span></span><input type="range" min="20" max="100" step="1" value={quality} onChange={event => setQuality(Number(event.target.value))} className="w-full accent-[var(--accent)]" /><span className="mt-1 flex justify-between text-[10px] text-muted"><span>Smaller file</span><span>Sharper image</span></span></label>}
            <fieldset className="mt-5">
              <legend className="system-label mb-2">Dimensions</legend>
              <div className="grid grid-cols-3 gap-1 rounded-ui border border-line bg-canvas p-1">
                {([['original', 'Original'], ['long-edge', 'Quick size'], ['custom', 'Custom']] as const).map(([value, label]) => <button key={value} onClick={() => selectResizeMode(value)} aria-pressed={resizeMode === value} className={`rounded-ui px-2 py-2 text-[11px] font-semibold ${resizeMode === value ? 'bg-accent text-white' : 'text-muted hover:bg-hover hover:text-ink'}`}>{label}</button>)}
              </div>

              {resizeMode === 'long-edge' && <label className="mt-3 block"><span className="mb-1.5 block text-[11px] font-semibold text-muted">Longest edge</span><select value={maxDimension} onChange={event => setMaxDimension(Number(event.target.value))} className="h-11 w-full px-3 text-sm font-semibold">{longEdgeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}

              {resizeMode === 'custom' && <div className="mt-3">
                <div className="grid grid-cols-[1fr_36px_1fr] items-end gap-2">
                  <label><span className="mb-1.5 block text-[11px] font-semibold text-muted">Width</span><div className="relative"><input aria-label="Width in pixels" type="number" inputMode="numeric" min="1" max="12000" value={customWidth} onChange={event => changeCustomWidth(event.target.value)} className="h-11 w-full px-3 pr-8 text-sm font-semibold" /><span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">px</span></div></label>
                  <button onClick={toggleAspectRatio} aria-label={preserveAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'} aria-pressed={preserveAspect} title={preserveAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'} className={`mb-1 flex h-9 w-9 items-center justify-center rounded-ui border ${preserveAspect ? 'border-accent bg-[var(--accent-soft)] text-accent' : 'border-line bg-canvas text-muted hover:bg-hover'}`}>{preserveAspect ? <Link size={15} /> : <Link2Off size={15} />}</button>
                  <label><span className="mb-1.5 block text-[11px] font-semibold text-muted">Height</span><div className="relative"><input aria-label="Height in pixels" type="number" inputMode="numeric" min="1" max="12000" value={customHeight} onChange={event => changeCustomHeight(event.target.value)} className="h-11 w-full px-3 pr-8 text-sm font-semibold" /><span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">px</span></div></label>
                </div>
                {!customDimensionsValid && <p className="mt-2 text-[10px] font-medium text-red-500" role="alert">Enter whole numbers from 1 to 12,000 px.</p>}
                <p className="mt-2 text-[10px] leading-4 text-muted">{preserveAspect ? 'Fits each image inside these dimensions without stretching.' : 'Forces every image to this exact size.'}</p>
              </div>}

              {resizeMode !== 'original' && <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-ui border border-line bg-canvas px-3 py-2.5"><input type="checkbox" checked={allowUpscale} onChange={event => setAllowUpscale(event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" /><span><span className="block text-[11px] font-semibold">Allow enlargement</span><span className="block text-[10px] text-muted">May soften small images</span></span></label>}
            </fieldset>
            {!isNative && <div className="mt-6"><ActionButton /></div>}
          </aside>
        </div>
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
