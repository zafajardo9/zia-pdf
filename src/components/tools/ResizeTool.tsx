/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState } from 'react'
import { Scaling, Info, Loader2, Lock, X } from 'lucide-react'
import { toast } from 'sonner'

import { addActivity } from '../../utils/recentActivity'
import { usePdfToolFile } from '../../utils/usePdfToolFile'
import SuccessState from './shared/SuccessState'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

type SizeKey = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'custom'

const STANDARD_SIZES: Record<Exclude<SizeKey, 'custom'>, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
}

const formatPt = (n: number) => `${Math.round(n)} pt`

export default function ResizeTool() {
  const { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument, reset } = usePdfToolFile()
  const [target, setTarget] = useState<SizeKey>('A4')
  const [customW, setCustomW] = useState('595')
  const [customH, setCustomH] = useState('842')
  const [mode, setMode] = useState<'fit' | 'exact'>('fit')
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-resize`)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
    if (e.target) e.target.value = ''
  }

  const onUnlock = async () => {
    if (!unlockPassword) return
    const ok = await handleUnlock(unlockPassword)
    if (!ok) toast.error('Incorrect password')
  }

  const resolveTarget = (): { w: number; h: number } | null => {
    if (target === 'custom') {
      const w = Number(customW)
      const h = Number(customH)
      if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0 || w > 14400 || h > 14400) {
        toast.error('Enter valid custom dimensions (1–14400 pt)')
        return null
      }
      return { w, h }
    }
    const [w, h] = STANDARD_SIZES[target]
    return { w, h }
  }

  const resizePdf = async () => {
    const t = resolveTarget()
    if (!t) return
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    try {
      const doc = await loadPdfDocument()
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize()
        if (mode === 'fit') {
          // Uniform scale: page becomes scale×original, aspect preserved, no distortion
          const scale = Math.min(t.w / width, t.h / height)
          page.scale(scale, scale) // scales content + all boxes uniformly
          page.setCropBox(0, 0, width * scale, height * scale) // normalize crop box to origin
        } else {
          // Exact: stretch content to fill target exactly (may distort aspect)
          page.scaleContent(t.w / width, t.h / height)
          page.setSize(t.w, t.h)
          page.setCropBox(0, 0, t.w, t.h)
        }
      }
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'Resize', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const ActionButtons = () => (
    <button
      onClick={resizePdf}
      disabled={isProcessing}
      className="w-full bg-blue-500 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20"
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <Scaling size={18} />} Resize Pages
    </button>
  )

  return (
    <NativeToolLayout title="Resize Pages" description="Scale your pages to standard or custom sizes." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButtons />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Scaling size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to start resizing pages</p>
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
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Target Size</label>
                  <div className="flex flex-wrap gap-2">
                    {(['A3', 'A4', 'A5', 'Letter', 'Legal'] as Exclude<SizeKey, 'custom'>[]).map(k => (
                      <button
                        key={k}
                        onClick={() => setTarget(k)}
                        className={`px-4 py-2 rounded-ui text-xs font-semibold transition-all flex flex-col items-center ${target === k ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-300'}`}
                      >
                        <span>{k}</span>
                        <span className={`text-[9px] opacity-70 ${target === k ? 'text-white' : ''}`}>{formatPt(STANDARD_SIZES[k][0])} × {formatPt(STANDARD_SIZES[k][1])}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setTarget('custom')}
                      className={`px-4 py-2 rounded-ui text-xs font-semibold uppercase tracking-widest transition-all ${target === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-300'}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {target === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-2 tracking-widest px-1">Width (pt)</label>
                      <input type="number" min={1} max={14400} value={customW} onChange={(e) => setCustomW(e.target.value)} className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-2 tracking-widest px-1">Height (pt)</label>
                      <input type="number" min={1} max={14400} value={customH} onChange={(e) => setCustomH(e.target.value)} className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('fit')}
                      className={`flex-1 px-4 py-3 rounded-ui text-xs font-semibold transition-all ${mode === 'fit' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-300'}`}
                    >
                      Fit — keep proportions
                    </button>
                    <button
                      onClick={() => setMode('exact')}
                      className={`flex-1 px-4 py-3 rounded-ui text-xs font-semibold transition-all ${mode === 'exact' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-300'}`}
                    >
                      Exact — fill page
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-[10px] text-gray-400">
                    {mode === 'fit' ? 'Uniformly scales content, preserving aspect ratio.' : 'Stretches content to fill the target size exactly (may distort).'}
                  </p>
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
                <SuccessState message="Pages Resized!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setDownloadUrl(null); reset() }} />
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
