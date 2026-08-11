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
import { Bookmark, Info, Loader2, Lock, Plus, X } from 'lucide-react'
import { PDFName } from 'pdf-lib'
import { toast } from 'sonner'

import { addActivity } from '../../utils/recentActivity'
import { usePdfToolFile } from '../../utils/usePdfToolFile'
import SuccessState from './shared/SuccessState'
import PrivacyBadge from './shared/PrivacyBadge'
import { NativeToolLayout } from './shared/NativeToolLayout'
import { BRAND } from '../../config/brand'

type BookmarkRow = { id: string; title: string; page: string }

const uid = () => Math.random().toString(36).slice(2)

export default function BookmarksTool() {
  const { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument, reset } = usePdfToolFile()
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([{ id: uid(), title: '', page: '' }])
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-bookmarks`)
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

  const updateBookmark = (id: string, patch: Partial<Omit<BookmarkRow, 'id'>>) => {
    setBookmarks(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const hasValid = bookmarks.some(b => b.title.trim().length > 0 && Number(b.page) >= 1)

  const addBookmarks = async () => {
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    try {
      const doc = await loadPdfDocument()
      const pageCount = doc.getPageCount()
      const valid = bookmarks
        .map(b => ({ title: b.title.trim(), page: Number(b.page) }))
        .filter(b => b.title.length > 0 && Number.isInteger(b.page) && b.page >= 1 && b.page <= pageCount)
      if (valid.length === 0) throw new Error('Enter at least one bookmark with a valid page number')

      const outline = doc.context.obj({ Type: 'Outlines', First: null, Last: null, Count: valid.length })
      const outlineRef = doc.context.register(outline) // indirect ref breaks Parent↔First cycle
      const itemRefs = valid.map(item =>
        doc.context.register(doc.context.obj({ Title: item.title, Parent: outlineRef, Dest: [doc.getPage(item.page - 1).ref, 'Fit'] }))
      )

      outline.set(PDFName.of('First'), itemRefs[0])
      outline.set(PDFName.of('Last'), itemRefs[itemRefs.length - 1])
      itemRefs.forEach((ref, i) => {
        const item = doc.context.lookup(ref) as any
        if (i > 0) item.set(PDFName.of('Prev'), itemRefs[i - 1])
        if (i < itemRefs.length - 1) item.set(PDFName.of('Next'), itemRefs[i + 1])
      })

      doc.catalog.set(PDFName.of('Outlines'), outlineRef)
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'Bookmarks', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const ActionButtons = () => (
    <button
      onClick={addBookmarks}
      disabled={!hasValid || isProcessing}
      className="w-full bg-blue-500 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20"
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <Bookmark size={18} />} Add Bookmarks
    </button>
  )

  return (
    <NativeToolLayout title="Bookmarks" description="Add a clickable table of contents to your PDF." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButtons />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Bookmark size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to start adding bookmarks</p>
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
                  <div className="flex items-center justify-between px-1 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Bookmarks</span>
                    <span className="text-[10px] text-gray-400">{pdfData.pageCount} pages</span>
                  </div>
                  <div className="space-y-3">
                    {bookmarks.map((b, i) => (
                      <div key={b.id} className="flex items-center gap-3">
                        <span className="w-6 text-center text-[10px] font-bold text-gray-400">{i + 1}</span>
                        <input
                          type="text"
                          value={b.title}
                          onChange={(e) => updateBookmark(b.id, { title: e.target.value })}
                          placeholder="Bookmark title"
                          className="flex-1 min-w-0 bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white"
                        />
                        <input
                          type="number"
                          min={1}
                          max={pdfData.pageCount}
                          value={b.page}
                          onChange={(e) => updateBookmark(b.id, { page: e.target.value })}
                          placeholder="Page"
                          className="w-24 bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-blue-500 outline-none font-bold text-sm dark:text-white text-center"
                        />
                        {bookmarks.length > 1 && (
                          <button onClick={() => setBookmarks(prev => prev.filter(x => x.id !== b.id))} aria-label="Remove bookmark row" className="p-2 text-gray-400 hover:text-rose-500 transition-colors"><X size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setBookmarks(prev => [...prev, { id: uid(), title: '', page: '' }])}
                    className="mt-3 w-full border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl py-3 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Add Bookmark
                  </button>
                  <p className="mt-3 px-1 text-[10px] text-gray-400">Page numbers are 1-based. Pages beyond {pdfData.pageCount} are ignored. Replaces any existing bookmarks.</p>
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
                <SuccessState message="Bookmarks Added!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setDownloadUrl(null); reset() }} />
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
