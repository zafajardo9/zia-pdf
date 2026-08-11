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
import { AppWindow, Info, Loader2, Lock, X } from 'lucide-react'
import { PDFName } from 'pdf-lib'
import { toast } from 'sonner'

import { addActivity } from '../../utils/recentActivity'
import { usePdfToolFile } from '../../utils/usePdfToolFile'
import SuccessState from './shared/SuccessState'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

type Layout = 'SinglePage' | 'OneColumn' | 'TwoColumnLeft' | 'TwoColumnRight' | 'TwoPageLeft' | 'TwoPageRight'
type Mode = 'UseNone' | 'UseOutlines' | 'UseThumbs' | 'FullScreen' | 'UseOC' | 'UseAttachments'

const LAYOUT_OPTIONS: { label: string; value: Layout | '' }[] = [
  { label: "Don't change", value: '' },
  { label: 'Single Page', value: 'SinglePage' },
  { label: 'One Column', value: 'OneColumn' },
  { label: 'Two Column', value: 'TwoColumnLeft' },
  { label: 'Two Page', value: 'TwoPageLeft' },
]

const MODE_OPTIONS: { label: string; value: Mode | '' }[] = [
  { label: "Don't change", value: '' },
  { label: 'None', value: 'UseNone' },
  { label: 'Show Bookmarks', value: 'UseOutlines' },
  { label: 'Show Thumbnails', value: 'UseThumbs' },
  { label: 'Full Screen', value: 'FullScreen' },
]

const ZOOM_OPTIONS: { label: string; value: string }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Fit Page', value: 'fit' },
  { label: 'Fit Width', value: 'fitWidth' },
  { label: '50%', value: '50' },
  { label: '75%', value: '75' },
  { label: '100%', value: '100' },
  { label: '125%', value: '125' },
  { label: '150%', value: '150' },
  { label: '200%', value: '200' },
]

export default function ViewerPrefsTool() {
  const { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument, reset } = usePdfToolFile()
  const [layout, setLayout] = useState<Layout | ''>('')
  const [mode, setMode] = useState<Mode | ''>('')
  const [zoom, setZoom] = useState<string>('default')
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-prefs`)
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

  const applyPrefs = async () => {
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    try {
      const doc = await loadPdfDocument() // loads with ignoreEncryption + password — catalog writes throw on encrypted docs
      if (layout) doc.catalog.set(PDFName.of('PageLayout'), PDFName.of(layout))
      if (mode) doc.catalog.set(PDFName.of('PageMode'), PDFName.of(mode))
      if (zoom !== 'default') {
        const first = doc.getPage(0)
        if (zoom === 'fit') doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj([first.ref, 'Fit']))
        else if (zoom === 'fitWidth') doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj([first.ref, 'FitH', null]))
        else doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj([first.ref, 'XYZ', null, null, Number(zoom) / 100]))
      }
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'Viewer Preferences', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-ui text-xs font-semibold transition-all ${active ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-300'}`}
    >
      {label}
    </button>
  )

  const ActionButtons = () => (
    <button
      onClick={applyPrefs}
      disabled={isProcessing}
      className="w-full bg-blue-500 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20"
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <AppWindow size={18} />} Apply Preferences
    </button>
  )

  return (
    <NativeToolLayout title="Viewer Preferences" description="Control how your PDF opens — layout, mode, and zoom." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButtons />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><AppWindow size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to start setting viewer preferences</p>
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
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Page Layout</label>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUT_OPTIONS.map(o => chip(o.label, layout === o.value, () => setLayout(o.value)))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Page Mode</label>
                  <div className="flex flex-wrap gap-2">
                    {MODE_OPTIONS.map(o => chip(o.label, mode === o.value, () => setMode(o.value)))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Initial Zoom</label>
                  <div className="flex flex-wrap gap-2">
                    {ZOOM_OPTIONS.map(o => chip(o.label, zoom === o.value, () => setZoom(o.value)))}
                  </div>
                  <p className="mt-2 px-1 text-[10px] text-gray-400">Layout & mode are ignored by some viewers; most honor initial zoom.</p>
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
                <SuccessState message="Viewer Preferences Applied!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setDownloadUrl(null); reset() }} />
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
