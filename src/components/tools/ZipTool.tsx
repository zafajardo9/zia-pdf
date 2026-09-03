/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useRef, useState } from 'react'
import { CheckSquare, File as FileIcon, FileArchive, FolderOpen, Loader2, Plus, Square, X } from 'lucide-react'
import JSZip from 'jszip'
import { toast } from 'sonner'

import { BRAND } from '../../config/brand'
import { addActivity } from '../../utils/recentActivity'
import { downloadFile } from '../../utils/pdfHelpers'
import PrivacyBadge from './shared/PrivacyBadge'
import SuccessState from './shared/SuccessState'
import { NativeToolLayout } from './shared/NativeToolLayout'

type ZipMode = 'compress' | 'extract'

export function dedupeName(used: Set<string>, name: string): string {
  if (!used.has(name)) { used.add(name); return name }
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 1
  let candidate = `${base} (${i})${ext}`
  while (used.has(candidate)) { i++; candidate = `${base} (${i})${ext}` }
  used.add(candidate)
  return candidate
}

export function sanitizeEntryName(raw: string): string {
  const parts = raw.replace(/\\/g, '/').split('/').filter(p => p !== '' && p !== '..')
  const safe = parts.join('-')
  return safe || 'file'
}

const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`

export default function ZipTool() {
  const compressInputRef = useRef<HTMLInputElement>(null)
  const extractInputRef = useRef<HTMLInputElement>(null)
  const zipRef = useRef<JSZip | null>(null)
  const [mode, setMode] = useState<ZipMode>('compress')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Compress state
  const [files, setFiles] = useState<File[]>([])
  const [customFileName, setCustomFileName] = useState(`${BRAND.filePrefix}-archive`)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  // Extract state
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [entries, setEntries] = useState<{ name: string }[]>([])
  const [selected, setSelected] = useState<string[]>([])

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const allSelected = entries.length > 0 && selected.length === entries.length

  const resetAll = () => {
    setFiles([]); setDownloadUrl(null); setProgress(0)
    setZipFile(null); setEntries([]); setSelected([]); zipRef.current = null
  }

  // ---------- Compress ----------
  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    setFiles(prev => [...prev, ...Array.from(list)])
  }

  const createZip = async () => {
    if (files.length === 0) return
    setIsProcessing(true); setProgress(0)
    try {
      const zip = new JSZip()
      const used = new Set<string>()
      for (const f of files) zip.file(dedupeName(used, f.name), f)
      const blob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE' },
        (meta) => setProgress(Math.round(meta.percent))
      )
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      addActivity({ name: `${customFileName}.zip`, tool: 'ZIP Compress', size: blob.size, resultUrl: url })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ---------- Extract ----------
  const handleZipFile = async (file: File) => {
    setIsProcessing(true)
    try {
      const buffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(buffer)
      const list = Object.keys(zip.files)
        .filter(name => !zip.files[name].dir)
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({ name }))
      if (list.length === 0) { toast.error('This ZIP contains no files.'); return }
      zipRef.current = zip
      setZipFile(file)
      setEntries(list)
      setSelected(list.map(e => e.name))
    } catch {
      toast.error('Could not read this ZIP. It may be corrupted or password-protected.')
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleEntry = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const extractSelected = async () => {
    const zip = zipRef.current
    if (!zip || selected.length === 0) return
    setIsProcessing(true); setProgress(0)
    try {
      let done = 0
      for (const name of selected) {
        const entry = zip.file(name)
        if (!entry) continue
        const blob = await entry.async('blob')
        await downloadFile(new Uint8Array(await blob.arrayBuffer()), sanitizeEntryName(name), blob.type || 'application/octet-stream')
        done++
        setProgress(Math.round((done / selected.length) * 100))
      }
      toast.success(`Extracted ${done} ${done === 1 ? 'file' : 'files'}`)
      if (zipFile) addActivity({ name: zipFile.name, tool: 'ZIP Extract', size: zipFile.size })
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const ProgressBar = (
    <div className="space-y-3">
      <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
        <div className="bg-blue-500 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-center font-semibold text-gray-400 uppercase tracking-widest animate-pulse">Processing...</p>
    </div>
  )

  const ActionButtons = () => {
    if (mode === 'compress') {
      return (
        <button onClick={createZip} disabled={isProcessing || files.length === 0} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl">
          {isProcessing ? <><Loader2 className="animate-spin" /> {progress}%</> : <><FileArchive size={18} /> Create ZIP ({files.length} {files.length === 1 ? 'File' : 'Files'})</>}
        </button>
      )
    }
    return (
      <button onClick={extractSelected} disabled={isProcessing || selected.length === 0} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20 py-4 rounded-lg text-sm md:p-6 md:rounded-xl md:text-xl">
        {isProcessing ? <><Loader2 className="animate-spin" /> {progress}%</> : <><FolderOpen size={18} /> Extract {selected.length} {selected.length === 1 ? 'File' : 'Files'}</>}
      </button>
    )
  }

  const showActions = !downloadUrl && ((mode === 'compress' && files.length > 0) || (mode === 'extract' && !!zipFile))

  return (
    <NativeToolLayout title="ZIP Tool" description="Compress files into ZIP archives or extract their contents — 100% on your device." actions={showActions && <ActionButtons />}>
      <input type="file" multiple className="hidden" ref={compressInputRef} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      <input type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" ref={extractInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleZipFile(f); e.target.value = '' }} />

      {!downloadUrl && (
        <div className="mb-6 flex gap-1 rounded-lg border border-line bg-surface p-1">
          {(['compress', 'extract'] as ZipMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-ui px-3.5 py-2 text-xs font-semibold ${mode === m ? 'bg-accent text-white' : 'text-muted hover:bg-hover hover:text-ink'}`}>
              {m === 'compress' ? 'Compress Files' : 'Extract ZIP'}
            </button>
          ))}
        </div>
      )}

      {mode === 'compress' ? (
        !downloadUrl ? (
          <div className="space-y-6">
            {files.length === 0 ? (
              <div onClick={() => !isProcessing && compressInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                <h3 className="text-xl font-bold dark:text-white mb-2">Select Files</h3>
                <p className="text-sm text-gray-400">Tap to add files to your archive</p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{files.length} files • {formatSize(totalSize)}</p>
                    <button onClick={() => compressInputRef.current?.click()} className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600"><Plus size={14} /> Add more</button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-black">
                        <FileIcon size={16} className="shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold dark:text-white">{f.name}</span>
                        <span className="shrink-0 text-[10px] font-semibold text-gray-400">{formatSize(f.size)}</span>
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="shrink-0 p-1 text-gray-400 transition-colors hover:text-red-500"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6 bg-white p-8 rounded-xl border border-gray-100 shadow-sm dark:bg-zinc-900 dark:border-white/5">
                  <div>
                    <label className="mb-3 block px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Output Filename</label>
                    <input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 border border-transparent dark:bg-black dark:text-white" />
                  </div>
                  {isProcessing && ProgressBar}
                  <button onClick={() => setFiles([])} className="w-full py-2 text-[10px] font-semibold uppercase text-gray-300 transition-colors hover:text-blue-500">Clear Files</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-white/5">
            <SuccessState message={`Compressed ${files.length} files!`} downloadUrl={downloadUrl} fileName={`${customFileName}.zip`} onStartOver={resetAll} showPreview={false} />
          </div>
        )
      ) : (
        !zipFile ? (
          <div onClick={() => !isProcessing && extractInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-xl p-12 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><FolderOpen size={32} /></div>
            <h3 className="text-xl font-bold dark:text-white mb-2">Select ZIP</h3>
            <p className="text-sm text-gray-400">Tap to browse its contents</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm dark:bg-zinc-900 dark:border-white/5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/20"><FileArchive size={24} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold dark:text-white">{zipFile.name}</h3>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{entries.length} files • {formatSize(zipFile.size)}</p>
              </div>
              <button onClick={resetAll} className="p-2 text-gray-400 transition-colors hover:text-blue-500"><X size={20} /></button>
            </div>
            <div className="space-y-3 bg-white p-6 rounded-xl border border-gray-100 shadow-sm dark:bg-zinc-900 dark:border-white/5">
              <button onClick={() => setSelected(allSelected ? [] : entries.map(e => e.name))} className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent">
                {allSelected ? <CheckSquare size={16} /> : <Square size={16} />} {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {entries.map(e => {
                  const isSelected = selected.includes(e.name)
                  return (
                    <button key={e.name} onClick={() => toggleEntry(e.name)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-black'}`}>
                      {isSelected ? <CheckSquare size={16} className="shrink-0 text-blue-500" /> : <Square size={16} className="shrink-0 text-gray-300 dark:text-zinc-600" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold dark:text-white">{e.name}</span>
                    </button>
                  )
                })}
              </div>
              <p className="pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-zinc-600">Folders are skipped • paths are flattened safely</p>
              {isProcessing && ProgressBar}
            </div>
          </div>
        )
      )}
      <PrivacyBadge />
    </NativeToolLayout>
  )
}
