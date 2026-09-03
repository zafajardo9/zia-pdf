/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

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
