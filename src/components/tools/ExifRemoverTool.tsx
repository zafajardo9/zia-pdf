/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Download, Eraser, Loader2, MapPin, MapPinOff, Plus, RotateCcw, Share2, ShieldCheck, Trash2, Upload } from 'lucide-react'
import JSZip from 'jszip'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'

import { BRAND } from '../../config/brand'
import { addActivity } from '../../utils/recentActivity'
import { downloadFile, shareFile } from '../../utils/pdfHelpers'
import { hapticSuccess } from '../../utils/haptics'
import { dedupeName } from './ZipTool'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'

type ImageFormat = 'jpeg' | 'webp' | 'png' | 'other'
type ExifInfo = { format: ImageFormat; hasExif: boolean; hasGps: boolean }
type ImageItem = { id: string; file: File; preview: string; info: ExifInfo; width?: number; height?: number }
type CleanedFile = { bytes: Uint8Array; fileName: string; mimeType: string; originalSize: number; previewUrl?: string }
type CleanResult = { url: string; bytes: Uint8Array; fileName: string; mimeType: string; count: number; saved: number; previewUrl?: string }

export function detectFormat(bytes: Uint8Array): ImageFormat {
  if (bytes.length > 3 && bytes[0] === 0xFF && bytes[1] === 0xD8) return 'jpeg'
  if (bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp'
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png'
  return 'other'
}

function findTiffGps(v: Uint8Array, exifStart: number): boolean {
  if (exifStart + 8 > v.length) return false
  const little = v[exifStart] === 0x49 && v[exifStart + 1] === 0x49
  const big = v[exifStart] === 0x4D && v[exifStart + 1] === 0x4D
  if (!little && !big) return false
  const u16 = (o: number) => little ? v[o] | (v[o + 1] << 8) : (v[o] << 8) | v[o + 1]
  const u32 = (o: number) => little ? (v[o] | (v[o + 1] << 8) | (v[o + 2] << 16) | (v[o + 3] << 24)) >>> 0 : ((v[o] << 24) | (v[o + 1] << 16) | (v[o + 2] << 8) | v[o + 3]) >>> 0
  if (u16(exifStart + 2) !== 42) return false
  const ifd0 = exifStart + u32(exifStart + 4)
  if (ifd0 + 2 > v.length) return false
  const entries = u16(ifd0)
  for (let e = 0; e < entries; e++) {
    const entry = ifd0 + 2 + e * 12
    if (entry + 12 > v.length) break
    if (u16(entry) === 0x8825) return true
  }
  return false
}

export function detectExif(bytes: Uint8Array): ExifInfo {
  const format = detectFormat(bytes)
  const none: ExifInfo = { format, hasExif: false, hasGps: false }
  try {
    if (format === 'jpeg') {
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return none
      let i = 2
      while (i + 4 <= bytes.length) {
        if (bytes[i] !== 0xFF) return none
        const marker = bytes[i + 1]
        if (marker === 0xDA || marker === 0xD9) break
        if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { i += 2; continue }
        const len = (bytes[i + 2] << 8) | bytes[i + 3]
        if (len < 2 || i + 2 + len > bytes.length) return none
        if (marker === 0xE1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 && bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66 && bytes[i + 8] === 0x00) {
          return { format, hasExif: true, hasGps: findTiffGps(bytes, i + 10) }
        }
        i += 2 + len
      }
      return none
    }
    if (format === 'webp') {
      const fourcc = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3])
      let i = 12
      while (i + 8 <= bytes.length) {
        const id = fourcc(i)
        const len = (bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24)) >>> 0
        if (id === 'EXIF') {
          let tiff = i + 8
          if (bytes[tiff] === 0x45 && bytes[tiff + 1] === 0x78) tiff += 6
          return { format, hasExif: true, hasGps: findTiffGps(bytes, tiff) }
        }
        if (id === 'XMP ') return { format, hasExif: true, hasGps: false }
        i += 8 + len + (len % 2)
      }
      return none
    }
    if (format === 'png') {
      let i = 8
      while (i + 12 <= bytes.length) {
        const len = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0
        const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7])
        if (type === 'eXIf') {
          let tiff = i + 8
          if (bytes[tiff] === 0x45 && bytes[tiff + 1] === 0x78) tiff += 6
          return { format, hasExif: true, hasGps: findTiffGps(bytes, tiff) }
        }
        i += 12 + len
      }
      return none
    }
    return none
  } catch {
    return none
  }
}

/** Losslessly removes EXIF/XMP/eXIf chunks — pixel data passes through bit-identical. */
export function stripExif(bytes: Uint8Array): Uint8Array {
  const format = detectFormat(bytes)
  if (format === 'jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) throw new Error('Not a valid JPEG')
    const out = [0xFF, 0xD8]
    let i = 2
    let hitSos = false
    while (i + 4 <= bytes.length) {
      if (bytes[i] !== 0xFF) throw new Error('Malformed JPEG structure')
      const marker = bytes[i + 1]
      if (marker === 0xDA) { hitSos = true; for (const b of bytes.subarray(i)) out.push(b); return new Uint8Array(out) }
      if (marker === 0xD9) { out.push(0xFF, 0xD9); i += 2; break }
      if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { out.push(bytes[i], bytes[i + 1]); i += 2; continue }
      const len = (bytes[i + 2] << 8) | bytes[i + 3]
      if (len < 2 || i + 2 + len > bytes.length) throw new Error('Malformed JPEG segment')
      if (marker !== 0xE1) for (const b of bytes.subarray(i, i + 2 + len)) out.push(b)
      i += 2 + len
    }
    if (!hitSos) throw new Error('Malformed JPEG structure')
    return new Uint8Array(out)
  }
  if (format === 'webp') {
    const fourcc = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3])
    if (bytes.length < 12 || fourcc(0) !== 'RIFF' || fourcc(8) !== 'WEBP') throw new Error('Not a valid WebP')
    const out: number[] = Array.from(bytes.subarray(0, 12))
    let i = 12
    let vp8xFlagsIndex = -1
    while (i + 8 <= bytes.length) {
      const id = fourcc(i)
      const len = (bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24)) >>> 0
      const chunkEnd = i + 8 + len + (len % 2)
      if (chunkEnd > bytes.length) throw new Error('Malformed WebP chunk')
      if (id !== 'EXIF' && id !== 'XMP ') {
        if (id === 'VP8X') vp8xFlagsIndex = out.length + 8
        for (const b of bytes.subarray(i, chunkEnd)) out.push(b)
      }
      i = chunkEnd
    }
    if (i !== bytes.length) throw new Error('Malformed WebP trailing bytes')
    if (vp8xFlagsIndex >= 0) out[vp8xFlagsIndex] &= ~0x0C
    const size = out.length - 8
    out[4] = size & 0xFF; out[5] = (size >> 8) & 0xFF; out[6] = (size >> 16) & 0xFF; out[7] = (size >> 24) & 0xFF
    return new Uint8Array(out)
  }
  if (format === 'png') {
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) throw new Error('Not a valid PNG')
    const out: number[] = Array.from(bytes.subarray(0, 8))
    let i = 8
    while (i + 12 <= bytes.length) {
      const len = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0
      const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7])
      const chunkEnd = i + 12 + len
      if (chunkEnd > bytes.length) throw new Error('Malformed PNG chunk')
      if (type !== 'eXIf') for (const b of bytes.subarray(i, chunkEnd)) out.push(b)
      i = chunkEnd
    }
    if (i !== bytes.length) throw new Error('Malformed PNG trailing bytes')
    return new Uint8Array(out)
  }
  throw new Error('Unsupported image format')
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '')
const extFor = (format: ImageFormat) => format === 'jpeg' ? 'jpg' : format
const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`

export default function ExifRemoverTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef(new Set<string>())
  const [images, setImages] = useState<ImageItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CleanResult | null>(null)
  const isNative = Capacitor.isNativePlatform()

  const dirtyImages = images.filter(image => image.info.hasExif)
  const gpsCount = images.filter(image => image.info.hasGps).length

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
    if (result) {
      revokeObjectUrl(result.url)
      if (result.previewUrl) revokeObjectUrl(result.previewUrl)
    }
    setResult(null)
  }

  const handleFiles = async (selectedFiles: FileList | File[]) => {
    const valid = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'))
    if (!valid.length) {
      toast.error('Choose a JPG, PNG, or WebP image.')
      return
    }
    clearResult()
    for (const file of valid) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        setImages(current => [...current, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview: makeObjectUrl(file),
          info: detectExif(bytes),
        }])
      } catch {
        toast.error(`Could not read ${file.name}.`)
      }
    }
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

  const reset = () => {
    images.forEach(image => revokeObjectUrl(image.preview))
    if (result) {
      revokeObjectUrl(result.url)
      if (result.previewUrl) revokeObjectUrl(result.previewUrl)
    }
    setImages([])
    setResult(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clean = async () => {
    if (!dirtyImages.length) return
    setIsProcessing(true)
    setProgress(0)
    clearResult()
    try {
      const cleaned: CleanedFile[] = []
      for (let index = 0; index < dirtyImages.length; index += 1) {
        const item = dirtyImages[index]
        const bytes = new Uint8Array(await item.file.arrayBuffer())
        const stripped = stripExif(bytes)
        cleaned.push({
          bytes: stripped,
          fileName: `${baseName(item.file.name)}-clean.${extFor(item.info.format)}`,
          mimeType: item.file.type,
          originalSize: item.file.size,
        })
        setProgress(Math.round(((index + 1) / dirtyImages.length) * 100))
      }

      let blob: Blob
      let fileName: string
      let mimeType: string
      let previewUrl: string | undefined
      if (cleaned.length === 1) {
        blob = new Blob([cleaned[0].bytes as BlobPart], { type: cleaned[0].mimeType })
        fileName = cleaned[0].fileName
        mimeType = cleaned[0].mimeType
        previewUrl = makeObjectUrl(blob)
      } else {
        const zip = new JSZip()
        const used = new Set<string>()
        cleaned.forEach(file => zip.file(dedupeName(used, file.fileName), file.bytes))
        blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        fileName = `${BRAND.filePrefix}-clean-images.zip`
        mimeType = 'application/zip'
      }
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const url = previewUrl || makeObjectUrl(blob)
      const saved = cleaned.reduce((sum, file) => sum + Math.max(0, file.originalSize - file.bytes.byteLength), 0)
      setResult({ url, bytes, fileName, mimeType, count: cleaned.length, saved, previewUrl })
      await addActivity({ name: fileName, tool: 'EXIF Remover', size: blob.size, resultUrl: url })
      await hapticSuccess()
      toast.success(cleaned.length === 1 ? 'Metadata stripped' : `${cleaned.length} images cleaned`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clean this image.')
    } finally {
      setIsProcessing(false)
    }
  }

  const saveResult = async () => {
    if (!result) return
    try {
      toast.loading(`Saving ${result.fileName}...`, { id: 'exif-save' })
      await downloadFile(result.bytes, result.fileName, result.mimeType)
      toast.success(isNative ? 'Saved to Documents' : 'Download started', { id: 'exif-save' })
    } catch {
      toast.error('Could not save the cleaned file.', { id: 'exif-save' })
    }
  }

  const shareResult = async () => {
    if (!result) return
    try {
      await shareFile(result.bytes, result.fileName, result.mimeType)
    } catch {
      toast.error('Could not share the cleaned file.')
    }
  }

  const badgeFor = (info: ExifInfo) => {
    if (info.format === 'other') return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-zinc-400">No EXIF in format</span>
    if (!info.hasExif) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"><ShieldCheck size={10} /> Clean</span>
    if (info.hasGps) return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-900/20 dark:text-red-400"><MapPin size={10} /> GPS found</span>
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">EXIF found</span>
  }

  const ActionButton = () => (
    <button onClick={clean} disabled={isProcessing || dirtyImages.length === 0} className="system-button-primary flex w-full items-center justify-center gap-2">
      {isProcessing ? <><Loader2 className="animate-spin" size={18} /> Cleaning {progress}%</> : <><Eraser size={18} /> Strip metadata from {dirtyImages.length > 1 ? `${dirtyImages.length} images` : 'image'} <ArrowRight size={18} /></>}
    </button>
  )

  return (
    <NativeToolLayout title="EXIF Remover" description="Delete hidden GPS locations, camera info, and metadata from photos — pixel-perfect, lossless, on your device." actions={isNative && images.length > 0 && !result ? <ActionButton /> : undefined}>
      <input ref={fileInputRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" onChange={event => { if (event.target.files) handleFiles(event.target.files); event.target.value = '' }} />

      {images.length === 0 ? (
        <button onClick={() => fileInputRef.current?.click()} className="group flex min-h-72 w-full flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface px-6 text-center hover:border-accent hover:bg-[var(--accent-soft)]">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-panel border border-line bg-canvas text-accent group-hover:border-accent/30"><Upload size={26} /></span>
          <span className="text-lg font-semibold">Choose photos</span>
          <span className="mt-2 max-w-sm text-sm leading-6 text-muted">Photos can hide where they were taken. Add JPG, PNG, or WebP files and every trace of metadata is stripped — without touching the pixels.</span>
        </button>
      ) : result ? (
        <div className="mx-auto max-w-xl space-y-5">
          <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
            <div className="flex items-center gap-3 text-sm font-semibold"><CheckCircle2 size={18} /> {result.count === 1 ? 'Your photo is clean' : `${result.count} photos are clean`}</div>
            <p className="mt-1 text-xs font-medium opacity-80">{formatSize(result.saved)} of hidden metadata removed • pixels untouched</p>
          </div>
          {result.previewUrl && <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-panel border border-line bg-[linear-gradient(45deg,var(--bg-hover)_25%,transparent_25%),linear-gradient(-45deg,var(--bg-hover)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--bg-hover)_75%),linear-gradient(-45deg,transparent_75%,var(--bg-hover)_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-4"><img src={result.previewUrl} alt="Cleaned image preview" className="max-h-[55vh] max-w-full rounded-ui object-contain shadow-ambient" /></div>}
          <div className="rounded-ui border border-line bg-surface px-4 py-3">
            <p className="truncate text-sm font-semibold">{result.fileName}</p>
            <p className="mt-1 text-xs text-muted">{(result.bytes.byteLength / 1024).toFixed(result.bytes.byteLength > 1024 * 1024 ? 0 : 1)} KB</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={shareResult} className="flex min-h-11 items-center justify-center gap-2 rounded-ui border border-line bg-surface px-4 text-sm font-semibold hover:bg-hover"><Share2 size={18} /> Share</button>
            <button onClick={saveResult} className="system-button-primary flex items-center justify-center gap-2"><Download size={18} /> {isNative ? 'Save' : 'Download'}</button>
          </div>
          <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-ui px-4 py-3 text-xs font-semibold text-muted hover:bg-hover hover:text-accent"><RotateCcw size={14} /> Clean more photos</button>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="system-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Selected photos</p>
                <p className="mt-0.5 text-xs text-muted">{images.length} {images.length === 1 ? 'file' : 'files'}{gpsCount > 0 ? ` • ${gpsCount} with GPS location` : ''}</p>
              </div>
              <button onClick={reset} className="rounded-ui p-2 text-muted hover:bg-hover hover:text-red-500" aria-label="Clear all images"><Trash2 size={17} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              {images.map(image => (
                <div key={image.id} className="group relative overflow-hidden rounded-ui border border-line bg-canvas">
                  <img src={image.preview} alt="" className="aspect-square w-full object-cover" onLoad={event => recordDimensions(image.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
                  <div className="space-y-1 border-t border-line bg-surface px-2.5 py-2">
                    <p className="truncate text-[11px] font-semibold">{image.file.name}</p>
                    {badgeFor(image.info)}
                  </div>
                  <button onClick={() => removeImage(image.id)} aria-label={`Remove ${image.file.name}`} className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-ui border border-dashed border-line text-muted hover:border-accent hover:bg-[var(--accent-soft)] hover:text-accent"><Plus size={22} /><span className="mt-2 text-xs font-semibold">Add more</span></button>
            </div>
          </section>

          {dirtyImages.length === 0 ? (
            <div className="flex items-center gap-3 rounded-panel border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
              <MapPinOff size={18} className="shrink-0" /> No hidden metadata found — these photos are already safe to share.
            </div>
          ) : (
            <>
              <div className="rounded-ui border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
                Stripping is <span className="font-semibold text-ink">lossless</span>: metadata blocks are surgically removed and every pixel passes through untouched. GPS, camera model, timestamps, and software tags all go.
              </div>
              {!isNative && <ActionButton />}
            </>
          )}
        </div>
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
