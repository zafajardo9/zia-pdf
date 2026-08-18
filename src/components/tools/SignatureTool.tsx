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
import { Loader2, Lock, Image as ImageIcon, ArrowRight, PenLine, Undo2, Trash2, X } from 'lucide-react'
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

type SignaturePdfData = { file: File, pageCount: number, isLocked: boolean, password?: string }
type Stroke = { points: { x: number, y: number }[], color: string, width: number }
type SignatureAsset = { blob: Blob, url: string }

const INK_COLORS = ['#111827', '#1d4ed8', '#b91c1c']

// Paint strokes with quadratic-midpoint smoothing (used by both the live pad and the export)
const paintStrokes = (ctx: CanvasRenderingContext2D, strokes: Stroke[]) => {
  for (const s of strokes) {
    if (!s.points.length) continue
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = s.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (s.points.length === 1) {
      ctx.beginPath()
      ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(s.points[0].x, s.points[0].y)
    for (let i = 1; i < s.points.length - 1; i++) {
      const midX = (s.points[i].x + s.points[i + 1].x) / 2
      const midY = (s.points[i].y + s.points[i + 1].y) / 2
      ctx.quadraticCurveTo(s.points[i].x, s.points[i].y, midX, midY)
    }
    const last = s.points[s.points.length - 1]
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
  }
}

// Convert any uploaded image (png/jpg/webp/...) to a PNG blob so pdf-lib can always embed it
const imageFileToPng = async (file: File): Promise<Blob> => {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('unreadable image'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas context')
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function SignatureTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<Stroke | null>(null)
  const dragStateRef = useRef<{ mode: 'move' | 'resize', grabDX: number, grabDY: number } | null>(null)
  const didDragRef = useRef(false)
  const redrawRef = useRef<() => void>(() => {})

  const { consumePipelineFile } = usePipeline()
  const [pdfData, setPdfData] = useState<SignaturePdfData | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-signed`)

  const [tab, setTab] = useState<'draw' | 'upload'>('draw')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [inkColor, setInkColor] = useState(INK_COLORS[0])
  const [inkWidth, setInkWidth] = useState(2.5)
  const [signature, setSignature] = useState<SignatureAsset | null>(null)

  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [preview, setPreview] = useState<{ url: string, w: number, h: number } | null>(null)

  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [sizePt, setSizePt] = useState(150)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })
      handleFile(file)
    }
  }, [])

  // Load the pdfjs document for live page rendering
  useEffect(() => {
    let cancelled = false
    if (pdfData && !pdfData.isLocked) {
      loadPdfDocument(pdfData.file)
        .then((doc) => { if (!cancelled) { setPdfJsDoc(doc); setPreviewPage(1) } })
        .catch(() => {})
    } else {
      setPdfJsDoc(null)
      setPreview(null)
    }
    return () => { cancelled = true }
  }, [pdfData])

  // Render the previewed page whenever the document or page changes
  useEffect(() => {
    let cancelled = false
    if (!pdfJsDoc) return
    ;(async () => {
      try {
        const page = await pdfJsDoc.getPage(previewPage)
        const base = page.getViewport({ scale: 1 }) // scale-1 dims == PDF points
        const scale = Math.min(800 / base.width, 1.6)
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport: vp }).promise
        if (!cancelled) setPreview({ url: canvas.toDataURL('image/webp', 0.9), w: base.width, h: base.height })
      } catch {
        // ignore render errors
      }
    })()
    return () => { cancelled = true }
  }, [pdfJsDoc, previewPage])

  const handleUnlock = async () => {
    if (!pdfData || !unlockPassword) return; setIsProcessing(true)
    try {
      const result = await unlockPdf(pdfData.file, unlockPassword)
      if (result.success) { setPdfData({ ...pdfData, isLocked: false, pageCount: result.pageCount, password: unlockPassword }) }
      else { toast.error('Incorrect password') }
    } finally { setIsProcessing(false) }
  }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') return; setIsProcessing(true)
    try {
      const meta = await getPdfMetaData(file)
      if (meta.isLocked) { setPdfData({ file, pageCount: 0, isLocked: true }) }
      else { setPdfData({ file, pageCount: meta.pageCount, isLocked: false }) }
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---- Signature drawing pad ----

  const redraw = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    const all = drawingRef.current ? [...strokes, drawingRef.current] : strokes
    paintStrokes(ctx, all)
  }
  redrawRef.current = redraw

  useEffect(() => {
    if (tab !== 'draw') return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      redrawRef.current()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [tab, strokes])

  const drawPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = drawCanvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onDrawDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = { points: [drawPoint(e)], color: inkColor, width: inkWidth }
    setIsDrawing(true)
    redrawRef.current()
  }

  const onDrawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current.points.push(drawPoint(e))
    redrawRef.current()
  }

  const onDrawUp = () => {
    if (!drawingRef.current) return
    const stroke = drawingRef.current
    drawingRef.current = null
    setIsDrawing(false)
    setStrokes(s => [...s, stroke])
  }

  const replaceSignature = (blob: Blob) => {
    setSignature(prev => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { blob, url: URL.createObjectURL(blob) }
    })
  }

  // Export the drawing as a tight, transparent PNG
  const commitDrawing = async () => {
    if (!strokes.length) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    strokes.forEach(s => s.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
    }))
    const pad = Math.max(...strokes.map(s => s.width)) / 2 + 4
    minX -= pad; minY -= pad; maxX += pad; maxY += pad
    const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1)
    const scale = 2 // export at 2x for crisp embedding
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w * scale)
    canvas.height = Math.ceil(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    ctx.translate(-minX, -minY)
    paintStrokes(ctx, strokes)
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'))
      replaceSignature(blob)
    } catch {
      toast.error('Could not create the signature image')
    }
  }

  const onSignatureFile = async (file: File) => {
    try {
      const blob = await imageFileToPng(file)
      replaceSignature(blob)
    } catch {
      toast.error('Could not read that image')
    }
  }

  // ---- Placement (drag / resize on the live page preview) ----

  const previewMetrics = () => {
    const el = previewRef.current
    if (!el || !preview) return null
    const rect = el.getBoundingClientRect()
    return { rect, pxPerPt: rect.width / preview.w }
  }

  const onSigDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    const m = previewMetrics(); if (!m) return
    previewRef.current?.setPointerCapture(e.pointerId)
    didDragRef.current = true // never let a grab fall through to click-to-place
    const centerXPx = (pos.x / 100) * m.rect.width
    const centerYPx = (pos.y / 100) * m.rect.height
    dragStateRef.current = { mode: 'move', grabDX: e.clientX - m.rect.left - centerXPx, grabDY: e.clientY - m.rect.top - centerYPx }
  }

  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    previewRef.current?.setPointerCapture(e.pointerId)
    didDragRef.current = true
    dragStateRef.current = { mode: 'resize', grabDX: 0, grabDY: 0 }
  }

  const onPreviewPointerMove = (e: React.PointerEvent) => {
    const st = dragStateRef.current
    const m = previewMetrics()
    const p = preview
    if (!st || !m || !p) return
    const px = e.clientX - m.rect.left
    const py = e.clientY - m.rect.top
    if (st.mode === 'move') {
      setPos({
        x: Math.max(0, Math.min(100, ((px - st.grabDX) / m.rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((py - st.grabDY) / m.rect.height) * 100)),
      })
    } else {
      const centerXPx = (pos.x / 100) * m.rect.width
      const leftEdgePx = centerXPx - (sizePt * m.pxPerPt) / 2
      setSizePt(Math.max(30, Math.min(p.w, (px - leftEdgePx) / m.pxPerPt)))
    }
  }

  const onPreviewPointerUp = () => {
    dragStateRef.current = null
    // click fires synchronously after pointerup — reset the drag guard just after it
    setTimeout(() => { didDragRef.current = false }, 0)
  }

  const onPreviewClick = (e: React.MouseEvent) => {
    if (!signature || didDragRef.current) { didDragRef.current = false; return }
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  // ---- Save ----

  const saveSignedPdf = async () => {
    if (!pdfData || !signature || !preview) return; setIsProcessing(true)
    try {
      const arrayBuffer = await pdfData.file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, { password: pdfData.password, ignoreEncryption: true } as any)
      const sigImage = await pdfDoc.embedPng(await signature.blob.arrayBuffer())
      const page = pdfDoc.getPages()[previewPage - 1]
      const { width, height } = page.getSize()
      let wPt = Math.min(sizePt, width)
      let hPt = wPt * (sigImage.height / sigImage.width)
      if (hPt > height) { const s = height / hPt; hPt = height; wPt *= s } // keep aspect inside the page
      const x = Math.max(0, Math.min(width - wPt, (pos.x / 100) * width - wPt / 2))
      const yTop = Math.max(0, Math.min(height - hPt, (pos.y / 100) * height - hPt / 2))
      page.drawImage(sigImage, { x, y: height - yTop - hPt, width: wPt, height: hPt })
      const pdfBytes = await pdfDoc.save(); const blob = new Blob([pdfBytes as any], { type: 'application/pdf' }); const url = URL.createObjectURL(blob)
      setDownloadUrl(url); addActivity({ name: `${customFileName}.pdf`, tool: 'Signature', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally { setIsProcessing(false) }
  }

  const resetAll = () => {
    setDownloadUrl(null); setPdfData(null); setPdfJsDoc(null); setPreview(null); setPreviewPage(1)
    setSignature(prev => { if (prev) URL.revokeObjectURL(prev.url); return null })
    setStrokes([]); setPos({ x: 50, y: 50 }); setSizePt(150); setUnlockPassword(''); setTab('draw')
  }

  const ActionButton = () => (
    <button onClick={saveSignedPdf} disabled={isProcessing || !signature || !preview} className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20 ${isNative ? 'py-4 rounded-lg text-sm' : 'p-6 rounded-xl text-xl'}`}>
      {isProcessing ? <Loader2 className="animate-spin" /> : <>Sign & Save <ArrowRight size={18} /></>}
    </button>
  )

  return (
    <NativeToolLayout title="Signature" description="Draw your signature or upload an image, then place it anywhere on the page." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButton />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input type="file" accept="image/*" className="hidden" ref={signatureInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) onSignatureFile(file); e.target.value = '' }} />
      {!pdfData ? (
        <button 
          onClick={() => !isProcessing && fileInputRef.current?.click()} 
          className="w-full border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 transition-all cursor-pointer group"
        >
          <ImageIcon size={32} className="mx-auto mb-4 text-blue-500" />
          <h3 className="text-xl font-bold dark:text-white">Select PDF</h3>
        </button>
      ) : pdfData.isLocked ? (
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-zinc-900 rounded-xl text-center"><Lock size={32} className="mx-auto mb-4 text-blue-500" /><input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} className="w-full p-4 mb-4 border rounded-xl" /><button onClick={handleUnlock} className="w-full p-4 bg-blue-500 text-white rounded-xl">Unlock</button></div>
      ) : (
        <div className="space-y-6">
          {!downloadUrl ? (
            <>
              <div>
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Place on page</span>
                  {pdfData.pageCount > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage <= 1}
                        aria-label="Previous page"
                        className="p-1.5 rounded-ui bg-gray-50 dark:bg-black border border-gray-100 dark:border-zinc-800 text-gray-500 hover:text-blue-500 disabled:opacity-30 text-xs font-bold leading-none"
                      >
                        ‹
                      </button>
                      <span className="text-[10px] font-bold text-gray-400">{previewPage} / {pdfData.pageCount}</span>
                      <button
                        onClick={() => setPreviewPage(p => Math.min(pdfData.pageCount, p + 1))}
                        disabled={previewPage >= pdfData.pageCount}
                        aria-label="Next page"
                        className="p-1.5 rounded-ui bg-gray-50 dark:bg-black border border-gray-100 dark:border-zinc-800 text-gray-500 hover:text-blue-500 disabled:opacity-30 text-xs font-bold leading-none"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
                <div
                  ref={previewRef}
                  onClick={onPreviewClick}
                  onPointerMove={onPreviewPointerMove}
                  onPointerUp={onPreviewPointerUp}
                  onPointerCancel={onPreviewPointerUp}
                  className="relative mx-auto max-w-xl overflow-hidden rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm bg-white touch-none select-none"
                  style={preview ? { aspectRatio: `${preview.w} / ${preview.h}` } : undefined}
                >
                  {preview ? (
                    <img src={preview.url} alt={`Page ${previewPage} preview`} className="absolute inset-0 h-full w-full object-contain pointer-events-none" draggable={false} />
                  ) : (
                    <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                  )}
                  {signature && preview && (
                    <div
                      onPointerDown={onSigDown}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${(sizePt / preview.w) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      className="absolute z-10 cursor-move rounded-sm ring-2 ring-blue-500 touch-none"
                    >
                      <img src={signature.url} alt="Signature" className="w-full pointer-events-none select-none" draggable={false} />
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setSignature(prev => { if (prev) URL.revokeObjectURL(prev.url); return null }) }}
                        aria-label="Remove signature"
                        className="absolute -left-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                      >
                        <X size={11} />
                      </button>
                      <div onPointerDown={onResizeDown} className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-blue-500 touch-none" />
                    </div>
                  )}
                  {!signature && preview && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-300">
                      Draw or upload a signature below, then drag it where you want
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-4">
                <div className="flex rounded-lg bg-gray-50 dark:bg-black p-1 border border-gray-100 dark:border-zinc-800">
                  <button
                    onClick={() => setTab('draw')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-all ${tab === 'draw' ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <PenLine size={14} /> Draw
                  </button>
                  <button
                    onClick={() => setTab('upload')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-all ${tab === 'upload' ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <ImageIcon size={14} /> Upload
                  </button>
                </div>

                {tab === 'draw' ? (
                  <>
                    <div className="relative overflow-hidden rounded-lg border border-dashed border-gray-200 dark:border-zinc-700 bg-white">
                      <canvas
                        ref={drawCanvasRef}
                        className="block h-44 w-full touch-none cursor-crosshair"
                        onPointerDown={onDrawDown}
                        onPointerMove={onDrawMove}
                        onPointerUp={onDrawUp}
                        onPointerCancel={onDrawUp}
                      />
                      {strokes.length === 0 && !isDrawing && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">Sign here</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {INK_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setInkColor(c)}
                            aria-label={`Ink ${c}`}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${inkColor === c ? 'border-blue-500 scale-110' : 'border-gray-200 dark:border-zinc-700'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={6}
                        step={0.5}
                        value={inkWidth}
                        onChange={(e) => setInkWidth(Number(e.target.value))}
                        aria-label="Ink thickness"
                        className="w-24 accent-blue-500"
                      />
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => setStrokes(s => s.slice(0, -1))}
                          disabled={!strokes.length}
                          aria-label="Undo last stroke"
                          className="flex items-center gap-1.5 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:text-blue-500 disabled:opacity-30"
                        >
                          <Undo2 size={13} /> Undo
                        </button>
                        <button
                          onClick={() => setStrokes([])}
                          disabled={!strokes.length}
                          aria-label="Clear signature"
                          className="flex items-center gap-1.5 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 size={13} /> Clear
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={commitDrawing}
                      disabled={!strokes.length}
                      className="w-full rounded-lg bg-blue-500 p-3 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-40"
                    >
                      Use This Signature
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => signatureInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-zinc-700 p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <ImageIcon size={24} className="mx-auto mb-2 text-blue-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Tap to upload a signature image</span>
                  </button>
                )}

                {signature && (
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-black p-3">
                    <img src={signature.url} alt="Current signature" className="h-12 max-w-[180px] object-contain" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-green-600">Ready — drag it on the page</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Output Filename</label>
                <input 
                  type="text" 
                  value={customFileName} 
                  onChange={(e) => setCustomFileName(e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white" 
                />
              </div>
            </>
          ) : (
            <SuccessState message="Signed Successfully!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={resetAll} />
          )}
          <button onClick={resetAll} className="w-full py-2 text-[10px] font-semibold uppercase text-gray-300 hover:text-blue-500 transition-colors">Close File</button>
        </div>
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
