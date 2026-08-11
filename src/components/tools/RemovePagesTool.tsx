/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useEffect, useRef } from 'react'
import { FileMinus2, Info, Loader2, Lock, X } from 'lucide-react'
import { toast } from 'sonner'

import { addActivity } from '../../utils/recentActivity'
import { usePdfToolFile } from '../../utils/usePdfToolFile'
import { loadPdfDocument, renderGridThumbnail } from '../../utils/pdfHelpers' // pdfjs loader + thumbnails
import SuccessState from './shared/SuccessState'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

// Lazy thumbnail: renders only when scrolled near (same pattern as SplitTool)
const LazyThumbnail = ({ pdfDoc, pageNum }: { pdfDoc: any, pageNum: number }) => {
  const [src, setSrc] = useState<string | null>(null)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pdfDoc || src) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        renderGridThumbnail(pdfDoc, pageNum).then(setSrc)
        observer.disconnect()
      }
    }, { rootMargin: '400px' })
    if (imgRef.current) observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [pdfDoc, pageNum, src])

  if (src) return <img src={src} className="w-full h-full object-cover animate-in fade-in duration-300" alt={`Page ${pageNum}`} />
  return (
    <div ref={imgRef} className="w-full h-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-xs font-bold text-gray-400">
      <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent dark:border-zinc-700 rounded-full animate-spin" />
    </div>
  )
}

export default function RemovePagesTool() {
  const { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument: loadPdfLib, reset } = usePdfToolFile()
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null)
  const [removing, setRemoving] = useState<Set<number>>(new Set())
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-removed`)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')

  useEffect(() => {
    if (pdfData && !pdfData.isLocked) {
      loadPdfDocument(pdfData.file).then(setPdfJsDoc).catch(console.error)
    } else {
      setPdfJsDoc(null)
    }
    setRemoving(new Set())
  }, [pdfData])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
    if (e.target) e.target.value = ''
  }

  const onUnlock = async () => {
    if (!unlockPassword) return
    const ok = await handleUnlock(unlockPassword)
    if (!ok) toast.error('Incorrect password')
  }

  const togglePage = (pageNum: number) => {
    setRemoving(prev => {
      const next = new Set(prev)
      if (next.has(pageNum)) next.delete(pageNum)
      else next.add(pageNum)
      return next
    })
  }

  const removePages = async () => {
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    try {
      const doc = await loadPdfLib()
      const total = doc.getPageCount()
      if (removing.size >= total) throw new Error('Cannot remove all pages — keep at least one')
      const indices = [...removing].map(n => n - 1).sort((a, b) => b - a) // 0-based, descending
      for (const idx of indices) doc.removePage(idx)
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'Remove Pages', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const ActionButtons = () => (
    <button
      onClick={removePages}
      disabled={removing.size === 0 || isProcessing}
      className="w-full bg-blue-500 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20"
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <FileMinus2 size={18} />} Remove {removing.size} Page{removing.size === 1 ? '' : 's'}
    </button>
  )

  return (
    <NativeToolLayout title="Remove Pages" description="Tap pages to delete them from your document." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButtons />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><FileMinus2 size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to start removing pages</p>
        </div>
      ) : pdfData.isLocked ? (
        <div className="max-w-md mx-auto relative z-[100]">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-white/5 text-center shadow-ambient">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={32} /></div>
            <h3 className="text-2xl font-bold mb-2 dark:text-white">File Protected</h3>
            <input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-50 dark:bg-black rounded-lg px-6 py-4 border border-transparent focus:border-blue-500 outline-none font-bold text-center mb-4 dark:text-white" />
            <button onClick={onUnlock} disabled={!unlockPassword || isProcessing} className="w-full bg-blue-500 text-white p-4 rounded-lg font-semibold uppercase text-xs">Unlock</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-white/5 flex items-center gap-6 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg flex items-center justify-center shrink-0"><Info size={24} /></div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-bold text-sm truncate dark:text-white">{pdfData.file.name}</h3>
              <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-widest">{pdfData.pageCount} Pages • {(pdfData.file.size / (1024*1024)).toFixed(1)} MB</p>
            </div>
            <button onClick={() => { setDownloadUrl(null); reset() }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><X size={20} /></button>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-white/5 space-y-6 shadow-sm">
            {!downloadUrl ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Select pages to remove</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${removing.size > 0 ? 'text-rose-500' : 'text-gray-400'}`}>{pdfData.pageCount} pages • {removing.size} marked</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {Array.from({ length: pdfData.pageCount }, (_, i) => i + 1).map(pageNum => {
                    const isRemoving = removing.has(pageNum)
                    return (
                      <button
                        key={pageNum}
                        onClick={() => togglePage(pageNum)}
                        aria-label={`${isRemoving ? 'Unmark' : 'Mark'} page ${pageNum} for removal`}
                        className={`relative aspect-[3/4] overflow-hidden rounded-ui border transition-all ${isRemoving ? 'border-rose-500 ring-2 ring-rose-500/60' : 'border-line hover:border-accent/40'}`}
                      >
                        <LazyThumbnail pdfDoc={pdfJsDoc} pageNum={pageNum} />
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{pageNum}</span>
                        {isRemoving && (
                          <span className="absolute inset-0 flex items-center justify-center bg-rose-500/30">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white"><X size={14} /></span>
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Output Filename</label>
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <>
                <SuccessState message="Pages Removed!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setDownloadUrl(null); reset() }} />
                <button onClick={() => { setDownloadUrl(null); reset() }} className="w-full py-2 text-[10px] font-semibold uppercase text-gray-300 hover:text-blue-500 transition-colors">Close File</button>
              </>
            )}
          </div>
        </div>
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
