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
import { ArrowRight, Check, Copy, Download, FileSearch, FileText, Loader2, Lock, X } from 'lucide-react'
import { toast } from 'sonner'
import { Capacitor } from '@capacitor/core'

import { getPdfMetaData, loadPdfDocument, unlockPdf, downloadFile } from '../../utils/pdfHelpers'
import { usePipeline } from '../../utils/pipelineContext'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

type PdfInspectorData = { file: File, pageCount: number, isLocked: boolean, pdfDoc?: any, password?: string }
type PdfType = 'TextBased' | 'Scanned' | 'Mixed'
type Classification = { pdfType: PdfType, pageCount: number, pagesNeedingOcr: number[] }
type InspectResult = { classification: Classification, markdown: string }

const MIN_OCR_CHARS = 20

type TextItem = { str: string, x: number, y: number, width: number, fontSize: number }

function buildLines(items: TextItem[]) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: TextItem[][] = []
  let current: TextItem[] = []
  let currentY: number | null = null
  for (const item of sorted) {
    const gap = currentY === null ? 0 : Math.abs(currentY - item.y)
    const tolerance = Math.max(3, (current.length ? Math.max(...current.map(c => c.fontSize)) : item.fontSize) * 0.5)
    if (currentY === null || gap > tolerance) {
      if (current.length) lines.push([...current])
      current = [item]
      currentY = item.y
    } else {
      current.push(item)
    }
  }
  if (current.length) lines.push(current)
  return lines
}

function lineToMarkdown(line: TextItem[]) {
  const sorted = [...line].sort((a, b) => a.x - b.x)
  const text = sorted.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()
  if (!text) return null
  const maxFont = Math.max(...sorted.map(i => i.fontSize))
  const isHeading = maxFont >= 16 && text.length <= 120
  return isHeading ? { text, heading: true } : { text, heading: false }
}

function pagesToMarkdown(pages: { pageIndex: number, items: TextItem[] }[]) {
  const parts: string[] = []
  for (const { pageIndex, items } of pages) {
    const md = [`<!-- Page ${pageIndex + 1} -->`]
    for (const line of buildLines(items)) {
      const mdLine = lineToMarkdown(line)
      if (!mdLine) continue
      md.push(mdLine.heading ? `# ${mdLine.text}` : mdLine.text)
    }
    parts.push(md.join('\n'))
  }
  return parts.join('\n\n')
}

function classifyPages(pages: { pageIndex: number, items: TextItem[] }[]): Classification {
  const perPage = pages.map(p => p.items.reduce((sum, i) => sum + i.str.length, 0))
  const pagesNeedingOcr = perPage.map((chars, i) => chars < MIN_OCR_CHARS ? i : -1).filter(i => i >= 0)
  const totalChars = perPage.reduce((sum, c) => sum + c, 0)
  let pdfType: PdfType = 'TextBased'
  if (totalChars === 0 || pagesNeedingOcr.length === pages.length) pdfType = 'Scanned'
  else if (pagesNeedingOcr.length > 0) pdfType = 'Mixed'
  return { pdfType, pageCount: pages.length, pagesNeedingOcr }
}

const typeBadge: Record<PdfType, { label: string, className: string }> = {
  TextBased: { label: 'Text-Based', className: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' },
  Mixed: { label: 'Mixed', className: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' },
  Scanned: { label: 'Scanned', className: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' },
}

export default function PdfInspectorTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { consumePipelineFile } = usePipeline()
  const [pdfData, setPdfData] = useState<PdfInspectorData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<InspectResult | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-inspect`)
  const [copied, setCopied] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })
      handleFile(file)
    }
  }, [])

  const handleUnlock = async () => {
    if (!pdfData || !unlockPassword) return
    setIsProcessing(true)
    const unlockResult = await unlockPdf(pdfData.file, unlockPassword)
    if (unlockResult.success) { setPdfData({ ...pdfData, isLocked: false, pageCount: unlockResult.pageCount, pdfDoc: unlockResult.pdfDoc, password: unlockPassword }) }
    else { toast.error('Incorrect password') }
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
        setPdfData({ file, pageCount: meta.pageCount, isLocked: false, pdfDoc })
        setCustomFileName(`${file.name.replace('.pdf', '')}-inspect`)
      }
      setResult(null)
    } catch (err) { console.error(err) } finally { setIsProcessing(false) }
  }

  const inspect = async () => {
    if (!pdfData || !pdfData.pdfDoc) return
    setIsProcessing(true); setProgress(0); setResult(null)
    try {
      const pages: { pageIndex: number, items: TextItem[] }[] = []
      for (let i = 1; i <= pdfData.pageCount; i++) {
        const page = await pdfData.pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const items: TextItem[] = content.items
          .filter((item: any) => item.str !== undefined && item.str.trim() !== '')
          .map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width || 0,
            fontSize: Math.hypot(item.transform[0], item.transform[1]),
          }))
        pages.push({ pageIndex: i - 1, items })
        setProgress(Math.round((i / pdfData.pageCount) * 100))
      }
      const classification = classifyPages(pages)
      const markdown = pagesToMarkdown(pages)
      setResult({ classification, markdown })
      toast.success(`Classified as ${typeBadge[classification.pdfType].label}`)
    } catch (err: any) { toast.error(err.message) } finally { setIsProcessing(false) }
  }

  const handleDownload = async () => {
    if (!result) return
    await downloadFile(result.markdown, `${customFileName}.md`, 'text/markdown')
  }

  const ActionButton = () => (
    <button onClick={inspect} disabled={isProcessing} className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20 ${isNative ? 'py-4 rounded-lg text-sm' : 'p-6 rounded-xl text-xl'}`}>
      {isProcessing ? <><Loader2 className="animate-spin" /> {progress}%</> : <>Inspect Document <ArrowRight size={18} /></>}
    </button>
  )

  return (
    <NativeToolLayout title="PDF Inspector" description="Classify your document and extract its structure as clean, layout-aware markdown." actions={pdfData && !pdfData.isLocked && !result && <ActionButton />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><FileSearch size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to analyze the document structure</p>
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
            <div className="w-16 h-20 bg-gray-50 dark:bg-black rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-blue-500"><FileText size={24} /></div>
            <div className="flex-1 min-w-0"><h3 className="font-bold text-sm truncate dark:text-white">{pdfData.file.name}</h3><p className="text-[10px] text-gray-400 uppercase font-semibold">{pdfData.pageCount} Pages • {(pdfData.file.size / (1024 * 1024)).toFixed(1)} MB</p></div>
            <button onClick={() => setPdfData(null)} className="p-2 text-gray-400 hover:text-blue-500"><X size={20} /></button>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-white/5 space-y-8 shadow-sm">
            {!result ? (
              <>
                {isProcessing && (
                  <div className="space-y-2"><div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner"><div className="bg-blue-500 h-full transition-all" style={{ width: `${progress}%` }} /></div><p className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest animate-pulse px-1">Analyzing document structure...</p></div>
                )}
                {!isProcessing && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-center leading-relaxed">Detects text-based vs scanned pages, then rebuilds the content as markdown with headings and reading order.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Output Filename</label>
                      <input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className={`flex-1 rounded-xl border p-5 ${typeBadge[result.classification.pdfType].className}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-1">Classification</p>
                    <p className="text-2xl font-semibold tracking-tight">{typeBadge[result.classification.pdfType].label}</p>
                  </div>
                  <div className="flex-1 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black p-5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">OCR Routing</p>
                    <p className="text-sm font-semibold dark:text-white leading-relaxed">
                      {result.classification.pagesNeedingOcr.length === 0
                        ? 'No pages need OCR — full text layer present.'
                        : `${result.classification.pagesNeedingOcr.length} of ${result.classification.pageCount} pages need OCR: ${result.classification.pagesNeedingOcr.map(i => i + 1).join(', ')}`}
                    </p>
                  </div>
                </div>

                {result.classification.pdfType !== 'TextBased' && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest text-center leading-relaxed">Scanned pages have no text layer. Use the PDF to Text tool with Deep OCR to recover their content.</p>
                  </div>
                )}

                <textarea readOnly value={result.markdown} className="w-full h-80 bg-gray-50 dark:bg-black border border-gray-100 dark:border-white/5 rounded-lg p-4 font-mono text-[10px] resize-none outline-none focus:border-blue-500 dark:text-gray-300 shadow-inner" />
                <div className="flex gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(result.markdown); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="flex-1 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 p-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all active:scale-95">{copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />} Copy</button>
                  <button onClick={handleDownload} className="flex-[2] bg-gray-900 dark:bg-white text-white dark:text-black p-4 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"><Download size={18} /> {isNative ? 'Save .md' : 'Download'}</button>
                </div>
                <button onClick={() => { setResult(null); setProgress(0); setPdfData(null) }} className="w-full py-2 text-gray-400 uppercase font-semibold text-[10px] hover:text-blue-500 transition-colors">Close File</button>
              </div>
            )}
          </div>
        </div>
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
