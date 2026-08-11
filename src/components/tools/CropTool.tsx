/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useEffect } from 'react'
import { Crop, Info, Loader2, Lock, X } from 'lucide-react'
import { toast } from 'sonner'

import { addActivity } from '../../utils/recentActivity'
import { usePdfToolFile } from '../../utils/usePdfToolFile'
import { loadPdfDocument } from '../../utils/pdfHelpers' // pdfjs loader for page-size readout
import SuccessState from './shared/SuccessState'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

type Side = 'top' | 'bottom' | 'left' | 'right'
type Preset = 'none' | 'tight' | 'normal' | 'wide'

const PRESETS: Record<Preset, Record<Side, number>> = {
  none: { top: 0, bottom: 0, left: 0, right: 0 },
  tight: { top: 24, bottom: 24, left: 24, right: 24 },
  normal: { top: 36, bottom: 36, left: 36, right: 36 },
  wide: { top: 72, bottom: 72, left: 72, right: 72 },
}

export default function CropTool() {
  const { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument: loadPdfLib, reset } = usePdfToolFile()
  const [margins, setMargins] = useState<Record<Side, number>>({ ...PRESETS.normal })
  const [preset, setPreset] = useState<Preset>('normal')
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-crop`)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null)

  // Load page 1 size (pdfjs viewport at scale 1 == PDF points) for the live result readout
  useEffect(() => {
    let cancelled = false
    if (pdfData && !pdfData.isLocked) {
      loadPdfDocument(pdfData.file)
        .then(async (doc) => {
          const page = await doc.getPage(1)
          const vp = page.getViewport({ scale: 1 })
          if (!cancelled) setPageSize({ w: Math.round(vp.width), h: Math.round(vp.height) })
        })
        .catch(() => {})
    } else {
      setPageSize(null)
    }
    return () => { cancelled = true }
  }, [pdfData])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
    if (e.target) e.target.value = ''
  }

  const applyPreset = (p: Preset) => {
    setPreset(p)
    setMargins({ ...PRESETS[p] })
  }

  const onUnlock = async () => {
    if (!unlockPassword) return
    const ok = await handleUnlock(unlockPassword)
    if (!ok) toast.error('Incorrect password')
  }

  const cropPdf = async () => {
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 300)) // min spinner time, matches MetadataTool
    try {
      const doc = await loadPdfLib()
      for (const page of doc.getPages()) { // v1: applies to all pages
        const { width, height } = page.getSize()
        const x = margins.left
        const y = margins.bottom
        const w = Math.max(width - margins.left - margins.right, 1) // guard against 0/negative
        const h = Math.max(height - margins.top - margins.bottom, 1)
        page.setMediaBox(x, y, w, h)
        page.setCropBox(x, y, w, h)
      }
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'Crop', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const resultW = pageSize ? Math.max(1, pageSize.w - margins.left - margins.right) : null
  const resultH = pageSize ? Math.max(1, pageSize.h - margins.top - margins.bottom) : null

  const ActionButtons = () => (
    <button
      onClick={cropPdf}
      disabled={isProcessing}
      className="w-full bg-blue-500 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20"
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <Crop size={18} />} Crop Pages
    </button>
  )

  return (
    <NativeToolLayout title="Crop Pages" description="Trim margins or whitespace from every page." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButtons />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Crop size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to start cropping pages</p>
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
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Preset</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PRESETS) as Preset[]).map(p => (
                      <button
                        key={p}
                        onClick={() => applyPreset(p)}
                        className={`px-4 py-2 rounded-ui text-xs font-semibold uppercase tracking-widest transition-all ${preset === p ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-300'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(['top', 'bottom', 'left', 'right'] as Side[]).map(side => (
                    <div key={side}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1">{side} margin</label>
                        <span className="text-[10px] font-bold text-gray-400">{margins[side]} pt</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={1}
                        value={margins[side]}
                        onChange={(e) => setMargins({ ...margins, [side]: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  ))}
                </div>

                {pageSize && resultW !== null && resultH !== null && (
                  <div className="flex items-center justify-between rounded-ui bg-gray-50 dark:bg-black border border-gray-100 dark:border-zinc-800 px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Result</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{resultW} × {resultH} pt</span>
                  </div>
                )}

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
                <SuccessState message="Pages Cropped!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setDownloadUrl(null); reset() }} />
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
