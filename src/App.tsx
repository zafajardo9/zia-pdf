/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useEffect, Suspense } from 'react'
import { 
  Layers, Scissors, Zap, Smartphone as SmartphoneIcon, Monitor as MonitorIcon, Lock, Unlock, 
  RotateCw, Type, Hash, Tags, FileText, ArrowUpDown, PenTool, 
  Wrench, ImagePlus, FileImage, Palette, X, ChevronDown,
  Crop, Scaling, FileMinus2, Bookmark, AppWindow, Images, FileArchive, Eraser
} from 'lucide-react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { Theme, ViewMode, Tool } from './types'
import Layout from './components/Layout'
import { PipelineProvider, usePipeline } from './utils/pipelineContext'
import { ViewModeProvider } from './utils/viewModeContext'
import { clearActivity, updateLastSeen, getLastSeen } from './utils/recentActivity'
import ScrollToTop from './components/ScrollToTop'

// Critical Views - No lazy loading to prevent dynamic import errors on Android
import WebView from './components/WebView'
import AndroidView from './components/AndroidView'
import AndroidToolsView from './components/AndroidToolsView'
import AndroidHistoryView from './components/AndroidHistoryView'
import About from './components/About'
import Thanks from './components/Thanks'
import PrivacyPolicy from './components/PrivacyPolicy'
import SettingsView from './components/Settings'
import PdfPreview from './components/PdfPreview'

// Tools - Also moving to static imports for stability in APK
import MergeTool from './components/tools/MergeTool'
import SplitTool from './components/tools/SplitTool'
import ProtectTool from './components/tools/ProtectTool'
import CompressTool from './components/tools/CompressTool'
import UnlockTool from './components/tools/UnlockTool'
import PdfToImageTool from './components/tools/PdfToImageTool'
import RotateTool from './components/tools/RotateTool'
import PdfToTextTool from './components/tools/PdfToTextTool'
import RearrangeTool from './components/tools/RearrangeTool'
import WatermarkTool from './components/tools/WatermarkTool'
import PageNumberTool from './components/tools/PageNumberTool'
import MetadataTool from './components/tools/MetadataTool'
import ImageToPdfTool from './components/tools/ImageToPdfTool'
import SignatureTool from './components/tools/SignatureTool'
import RepairTool from './components/tools/RepairTool'
import ExtractImagesTool from './components/tools/ExtractImagesTool'
import GrayscaleTool from './components/tools/GrayscaleTool'
import CropTool from './components/tools/CropTool'
import ResizeTool from './components/tools/ResizeTool'
import RemovePagesTool from './components/tools/RemovePagesTool'
import BookmarksTool from './components/tools/BookmarksTool'
import ViewerPrefsTool from './components/tools/ViewerPrefsTool'
import ImageConverterTool from './components/tools/ImageConverterTool'
import ZipTool from './components/tools/ZipTool'
import ExifRemoverTool from './components/tools/ExifRemoverTool'

const tools: Tool[] = [
  { title: 'Merge PDF', desc: 'Combine multiple PDF files into one document.', icon: Layers, implemented: true, path: '/merge', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Split PDF', desc: 'Visually extract specific pages or ranges.', icon: Scissors, implemented: true, path: '/split', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Compress PDF', desc: 'Optimize your file size for easier sharing.', icon: Zap, implemented: true, path: '/compress', category: 'Optimize', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Protect PDF', desc: 'Secure your documents with strong encryption.', icon: Lock, implemented: true, path: '/protect', category: 'Secure', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Unlock PDF', desc: 'Remove passwords from your protected files.', icon: Unlock, implemented: true, path: '/unlock', category: 'Secure', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Rotate PDF', desc: 'Fix page orientation permanently.', icon: RotateCw, implemented: true, path: '/rotate-pdf', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Rearrange PDF', desc: 'Drag and drop pages to reorder them.', icon: ArrowUpDown, implemented: true, path: '/rearrange-pdf', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Page Numbers', desc: 'Add numbering to your documents automatically.', icon: Hash, implemented: true, path: '/page-numbers', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Watermark', desc: 'Overlay custom text for branding or security.', icon: Type, implemented: true, path: '/watermark', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Metadata', desc: 'Edit document properties for better privacy.', icon: Tags, implemented: true, path: '/metadata', category: 'Secure', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Signature', desc: 'Draw or upload your signature, then place it anywhere on the document.', icon: PenTool, implemented: true, path: '/signature', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Grayscale', desc: 'Convert all document pages to black and white.', icon: Palette, implemented: true, path: '/grayscale', category: 'Optimize', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'PDF to Image', desc: 'Convert document pages into high-quality images.', icon: FileImage, implemented: true, path: '/pdf-to-image', category: 'Convert', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Image to PDF', desc: 'Convert JPG, PNG, and WebP into a professional PDF.', icon: ImagePlus, implemented: true, path: '/image-to-pdf', category: 'Convert', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Image Converter', desc: 'Convert images to WebP, JPG, or PNG and resize them.', icon: Images, implemented: true, path: '/image-converter', category: 'Convert', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Extract Images', desc: 'Pull out all original images embedded in a PDF.', icon: FileImage, implemented: true, path: '/extract-images', category: 'Convert', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'PDF to Text', desc: 'Extract plain text from your PDF documents.', icon: FileText, implemented: true, path: '/pdf-to-text', category: 'Convert', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Repair PDF', desc: 'Attempt to fix corrupted or unreadable documents.', icon: Wrench, implemented: true, path: '/repair', category: 'Optimize', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Crop Pages', desc: 'Trim margins or whitespace from your pages.', icon: Crop, implemented: true, path: '/crop-pdf', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Resize Pages', desc: 'Scale pages to standard or custom sizes.', icon: Scaling, implemented: true, path: '/resize-pdf', category: 'Optimize', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Remove Pages', desc: 'Delete specific pages from your document.', icon: FileMinus2, implemented: true, path: '/remove-pages', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Bookmarks', desc: 'Add a clickable table of contents to your PDF.', icon: Bookmark, implemented: true, path: '/bookmarks', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'Viewer Preferences', desc: 'Control how your PDF opens — layout, mode, zoom.', icon: AppWindow, implemented: true, path: '/viewer-preferences', category: 'Edit', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'ZIP Tool', desc: 'Compress files into ZIP archives or extract their contents.', icon: FileArchive, implemented: true, path: '/zip', category: 'Convert', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
  { title: 'EXIF Remover', desc: 'Delete hidden GPS locations and camera metadata from photos — lossless.', icon: Eraser, implemented: true, path: '/exif-remover', category: 'Secure', color: 'text-accent', bg: 'bg-[var(--accent-soft)]' },
]

export const IS_OCR_DISABLED = import.meta.env.VITE_DISABLE_OCR === 'true'
export const activeTools = IS_OCR_DISABLED 
  ? tools.filter(t => t.path !== '/pdf-to-text') 
  : tools

function QuickDropModal({ file, onClear, onBack }: { file: File, onClear: () => void, onBack?: () => void }) {
  const navigate = useNavigate()
  const { setPipelineFile } = usePipeline()
  const [showMore, setShowMore] = useState(false)
  
  const essentials = activeTools.slice(0, 4)
  const otherTools = activeTools.slice(4)

  const handleAction = async (path: string, title: string) => {
    toast.loading(`Importing ${file.name}...`, { id: 'quick-load' })
    
    try {
      const buffer = await file.arrayBuffer()
      setPipelineFile({
        buffer: new Uint8Array(buffer),
        name: file.name,
        type: file.type || (file.name.endsWith('.zip') ? 'application/zip' : 'application/pdf')
      })

      onClear()
      navigate(path)
      toast.success(`Opened in ${title}`, { id: 'quick-load' })
    } catch (err) {
      toast.error('Failed to process file', { id: 'quick-load' })
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="quick-drop-title">
      <div className="w-full max-w-md overflow-hidden rounded-t-panel border border-line bg-elevated shadow-ambient sm:rounded-panel">
        
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                {onBack && (
                  <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-blue-500 transition-colors">
                    <ChevronDown className="rotate-90" size={20} />
                  </button>
                )}
                <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/20">
                   <FileText size={20} />
                </div>
                <div className="min-w-0">
                   <h3 id="quick-drop-title" className="mb-1 max-w-[200px] truncate text-base font-semibold leading-none text-ink">{file.name}</h3>
                   <p className="system-label">{(file.size / (1024*1024)).toFixed(2)} MB · PDF document</p>
                </div>
             </div>
             <button onClick={onClear} aria-label="Close" className="rounded-ui p-2 text-muted hover:bg-hover hover:text-accent"><X size={18}/></button>
          </div>
        </div>
        
        <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
           <div>
              <h4 className="system-label mb-3 ml-1">Suggested tools</h4>
              <div className="grid grid-cols-2 gap-2.5">
                 {essentials.map(tool => (
                   <button
                     key={tool.title}
                     onClick={() => tool.path && handleAction(tool.path, tool.title)}
                     className="group flex items-center gap-3 rounded-ui border border-line bg-surface p-3 text-left hover:border-accent/40 hover:bg-hover"
                   >
                     <div className={`p-2 rounded-xl ${tool.bg} ${tool.color} group-active:scale-110 transition-transform`}>
                       <tool.icon size={18} strokeWidth={2.5} />
                     </div>
                     <span className="text-xs font-bold text-gray-900 dark:text-zinc-200">{tool.title}</span>
                   </button>
                 ))}
              </div>
           </div>

           <div>
              <button 
                onClick={() => setShowMore(!showMore)}
                className="flex w-full items-center justify-between rounded-ui border border-line bg-surface p-3 text-xs font-semibold text-muted hover:bg-hover hover:text-accent"
              >
                <span>Full Tool Catalog</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${showMore ? 'rotate-180' : ''}`} />
              </button>
              
              {showMore && (
                <div className="grid grid-cols-2 gap-2.5 mt-3 animate-in slide-in-from-top-2 duration-300 pb-2">
                   {otherTools.map(tool => (
                     <button
                       key={tool.title}
                       onClick={() => tool.path && handleAction(tool.path, tool.title)}
                       className="group flex items-center gap-3 rounded-ui border border-line bg-surface p-3 text-left hover:border-accent/40 hover:bg-hover"
                     >
                       <div className={`p-2 rounded-xl ${tool.bg} ${tool.color} group-active:scale-110 transition-transform`}>
                         <tool.icon size={18} strokeWidth={2.5} />
                       </div>
                       <span className="text-xs font-bold text-gray-900 dark:text-zinc-200">{tool.title}</span>
                     </button>
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return Capacitor.isNativePlatform() ? 'android' : 'web'
  })
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [showQuickDrop, setShowQuickDrop] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme) return savedTheme
    }
    return 'system'
  })

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Improved Auto-Wipe Logic
  useEffect(() => {
    const isAutoWipeEnabled = localStorage.getItem('autoWipe') === 'true'
    const timerMinutes = parseInt(localStorage.getItem('autoWipeTimer') || '15')
    const lastSeen = getLastSeen()
    const now = Date.now()

    if (isAutoWipeEnabled) {
      const elapsedMinutes = (now - lastSeen) / (1000 * 60)
      if (timerMinutes === 0 || (lastSeen > 0 && elapsedMinutes >= timerMinutes)) {
        clearActivity().then(() => {
          console.log(`Auto-Wipe triggered (${elapsedMinutes.toFixed(1)}m inactivity).`)
        })
      }
    }

    updateLastSeen()
    const interval = setInterval(updateLastSeen, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    
    const applyTheme = (t: Theme) => {
      let resolvedTheme = t
      if (t === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      
      if (resolvedTheme === 'dark') {
        root.classList.add('dark')
        root.style.colorScheme = 'dark'
      } else {
        root.classList.remove('dark')
        root.style.colorScheme = 'light'
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme('system')
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  // Handle Intent Files (Android "Open With" / "Share to")
  useEffect(() => {
    const handleIntentFile = async (uri: string) => {
      try {
        toast.loading('Importing file...', { id: 'intent-load' })
        const fileContent = await Filesystem.readFile({ path: uri })
        const blob = await (await fetch(`data:application/pdf;base64,${fileContent.data}`)).blob()
        const fileName = uri.split('/').pop() || 'imported-file.pdf'
        const file = new File([blob], fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`, { type: 'application/pdf' })
        setDroppedFile(file)
        toast.success('File imported successfully!', { id: 'intent-load' })
      } catch (error) {
        console.error('Intent load error:', error)
        toast.error('Failed to import file.', { id: 'intent-load' })
      }
    }

    const onFileIntent = (e: any) => {
      if (e.detail?.uri) {
        handleIntentFile(e.detail.uri)
      }
    }

    window.addEventListener('fileIntent', onFileIntent)
    return () => window.removeEventListener('fileIntent', onFileIntent)
  }, [])

  // Handle Global Quick Drop Trigger (from other components)
  useEffect(() => {
    const handleGlobalTrigger = (e: any) => {
      if (e.detail?.file) {
        setDroppedFile(e.detail.file)
        setShowQuickDrop(true)
      }
    }
    window.addEventListener('open-quick-drop' as any, handleGlobalTrigger)
    return () => window.removeEventListener('open-quick-drop' as any, handleGlobalTrigger)
  }, [])

  const LoadingSpinner = () => (
    <div className="flex min-h-[60vh] h-full w-full items-center justify-center bg-canvas" role="status" aria-label="Loading">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent"></div>
    </div>
  )

  const handleGlobalDrop = (files: FileList) => {
    const file = files[0]
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please drop a valid PDF file.')
      return
    }
    setDroppedFile(file)
    setShowQuickDrop(false) // Show preview first
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <ViewModeProvider viewMode={viewMode} setViewMode={setViewMode}>
        <PipelineProvider>
          <Layout theme={theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme} toggleTheme={toggleTheme} tools={activeTools} onFileDrop={handleGlobalDrop} viewMode={viewMode}>
            <Toaster 
              position="top-center" 
              expand={true} 
              richColors 
              duration={2000}
              toastOptions={{
                className: 'dark:bg-zinc-900 dark:text-white dark:border-white/10 mt-12',
                style: { zIndex: 1000 }
              }}
            />
            
            {droppedFile && (
              <PdfPreview 
                file={droppedFile} 
                onClose={() => {
                  setDroppedFile(null)
                  setShowQuickDrop(false)
                }} 
                onProcess={() => setShowQuickDrop(true)} 
              />
            )}

            {droppedFile && showQuickDrop && (
              <QuickDropModal 
                file={droppedFile} 
                onClear={() => {
                  setDroppedFile(null)
                  setShowQuickDrop(false)
                }} 
                onBack={() => setShowQuickDrop(false)}
              />
            )}

            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={
                  viewMode === 'web' ? (
                    <WebView tools={activeTools} />
                  ) : (
                    <AndroidView toggleTheme={toggleTheme} theme={theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme} onFileSelect={(file) => handleGlobalDrop([file] as any)} />
                  )
                } />
                <Route path="/android-tools" element={<AndroidToolsView tools={activeTools} />} />
                <Route path="/android-history" element={<AndroidHistoryView />} />
                <Route path="/merge" element={<MergeTool />} />
                <Route path="/split" element={<SplitTool />} />
                <Route path="/protect" element={<ProtectTool />} />
                <Route path="/unlock" element={<UnlockTool />} />
                <Route path="/compress" element={<CompressTool />} />
                <Route path="/pdf-to-image" element={<PdfToImageTool />} />
                <Route path="/rotate-pdf" element={<RotateTool />} />
                {!IS_OCR_DISABLED && <Route path="/pdf-to-text" element={<PdfToTextTool />} />}
                <Route path="/rearrange-pdf" element={<RearrangeTool />} />
                <Route path="/watermark" element={<WatermarkTool />} />
                <Route path="/page-numbers" element={<PageNumberTool />} />
                <Route path="/metadata" element={<MetadataTool />} />
                <Route path="/image-to-pdf" element={<ImageToPdfTool />} />
                <Route path="/image-converter" element={<ImageConverterTool />} />
                <Route path="/signature" element={<SignatureTool />} />
                <Route path="/repair" element={<RepairTool />} />
                <Route path="/extract-images" element={<ExtractImagesTool />} />
                <Route path="/grayscale" element={<GrayscaleTool />} />
                <Route path="/crop-pdf" element={<CropTool />} />
                <Route path="/resize-pdf" element={<ResizeTool />} />
                <Route path="/remove-pages" element={<RemovePagesTool />} />
                <Route path="/bookmarks" element={<BookmarksTool />} />
                <Route path="/viewer-preferences" element={<ViewerPrefsTool />} />
                <Route path="/zip" element={<ZipTool />} />
                <Route path="/exif-remover" element={<ExifRemoverTool />} />
                <Route path="/about" element={<About viewMode={viewMode} />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/settings" element={<SettingsView theme={theme} setTheme={setTheme} />} />
                <Route path="/thanks" element={<Thanks />} />
              </Routes>
            </Suspense>

            {/* Chameleon Toggle (Dev Only) */}
            {import.meta.env.DEV && (
              <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-2">
                <button
                  onClick={() => setViewMode(prev => prev === 'web' ? 'android' : 'web')}
                  className="bg-gray-900 dark:bg-zinc-800 text-white p-4 rounded-xl shadow-ambient hover:bg-blue-500 transition-all duration-300 flex items-center gap-3 border border-white/10 group active:scale-95"
                  title="Toggle Chameleon Mode"
                >
                  {viewMode === 'web' ? <SmartphoneIcon size={20} /> : <MonitorIcon size={20} />}
                  <span className="text-xs font-semibold uppercase tracking-tighter">{viewMode}</span>
                </button>
              </div>
            )}
          </Layout>
        </PipelineProvider>
      </ViewModeProvider>
    </HashRouter>
  )
}

export default App
