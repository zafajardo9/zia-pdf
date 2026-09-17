/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Loader2, Lock, Share2, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { App } from '@capacitor/app'
import { loadPdfDocument, renderPageThumbnail, shareFile, unlockPdf } from '../utils/pdfHelpers'
import { BrandLogo } from './Logo'

interface PdfPreviewProps {
  file: File
  onClose: () => void
  onProcess: () => void
}

const LazyPage = ({ pdfDoc, pageNum }: { pdfDoc: any, pageNum: number }) => {
  const [img, setImg] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pdfDoc || img || isRendering) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsRendering(true)
        renderPageThumbnail(pdfDoc, pageNum, 2.0).then(data => {
          setImg(data)
          setIsRendering(false)
        })
        observer.disconnect()
      }
    }, { rootMargin: '600px' })

    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [pdfDoc, pageNum, img, isRendering])

  return (
    <div 
      ref={containerRef}
      data-page-num={pageNum}
      className="relative flex flex-col items-center justify-center snap-center"
    >
      {/* The sheet itself stays white — it is the document, not UI chrome. */}
      <div className="group relative flex min-h-[300px] w-full max-w-[95%] items-center justify-center overflow-hidden rounded-panel bg-white shadow-card ring-1 ring-[var(--border-soft)] transition-shadow duration-500 md:max-w-full">
        {img ? (
          <img 
            src={img} 
            alt={`Page ${pageNum}`} 
            className="h-auto max-w-full select-none object-contain" 
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-20">
             <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}
        <span className="system-label absolute bottom-3 right-4 rounded-ui bg-surface/85 px-2 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {pageNum}
        </span>
      </div>
    </div>
  )
}

export default function PdfPreview({ file, onClose, onProcess }: PdfPreviewProps) {
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [password, setPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const doc = await loadPdfDocument(file)
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
      } catch (err: any) {
        if (err.name === 'PasswordException') {
          setIsLocked(true)
        }
        console.error('Preview load error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()

    // Handle Hardware Back Button
    const backListener = App.addListener('backButton', () => {
      onClose()
    })

    return () => {
      backListener.then(l => l.remove())
    }
  }, [file, onClose])

  const handleUnlock = async () => {
    if (!password) return
    setIsUnlocking(true)
    try {
      const result = await unlockPdf(file, password)
      if (result.success) {
        setPdfDoc(result.pdfDoc)
        setTotalPages(result.pageCount)
        setIsLocked(false)
        toast.success('Document unlocked')
      } else {
        toast.error('Incorrect password')
      }
    } catch (e) {
      toast.error('Failed to unlock')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    // Update current page based on intersection
    const pages = e.currentTarget.querySelectorAll('[data-page-num]')
    pages.forEach(page => {
      const rect = page.getBoundingClientRect()
      if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
        setCurrentPage(Number(page.getAttribute('data-page-num')))
      }
    })
  }

  const handleShare = async () => {
    const buffer = await file.arrayBuffer()
    await shareFile(new Uint8Array(buffer), file.name, file.type)
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex flex-col overflow-hidden overscroll-none bg-viewer motion-safe:animate-fade-in">
      
      {/* Fixed Header — frosted bar so pages blur underneath while scrolling */}
      <header
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-line-soft bg-glass px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl backdrop-saturate-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button 
            onClick={onClose} 
            aria-label="Close preview"
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-ui text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-hover">
                <BrandLogo size={20} />
             </div>
             <div className="min-w-0">
                <h2 className="max-w-[46vw] truncate text-sm font-medium leading-tight text-ink sm:max-w-[240px]">{file.name}</h2>
                <div className="mt-1 flex items-center gap-1.5">
                   <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                   <p className="system-label">Secure view</p>
                </div>
             </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            aria-label="Share document"
            className="flex h-10 w-10 items-center justify-center rounded-ui border border-line-soft bg-surface text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <Share2 size={18} strokeWidth={1.8} />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onProcess();
            }}
            aria-label="Choose a tool"
            className="flex h-10 w-10 items-center justify-center rounded-ui bg-accent text-white transition-all hover:bg-accent-hover active:scale-95"
          >
            <Plus size={20} strokeWidth={1.9} />
          </button>
        </div>
      </header>

      {/* Main Content — scrollable list of pages */}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-none bg-viewer scrollbar-hide"
      >
        <div className="flex min-h-full flex-col items-center space-y-10 pb-40 pt-32">
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="system-label">Decoding layers…</p>
            </div>
          )}

          {isLocked ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-xl2 border border-line-soft bg-[var(--accent-soft)] text-accent">
                <Lock size={26} strokeWidth={1.7} />
              </div>
              <h3 className="type-headline-lg mb-3 text-ink">This document is protected</h3>
              <p className="type-body-md mx-auto mb-8 max-w-xs text-muted">
                Enter the password to preview the contents. Nothing is sent anywhere — unlocking happens on your device.
              </p>
              
              <div className="mb-10 w-full max-w-xs space-y-3">
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                   placeholder="Enter password"
                   aria-label="Document password"
                   className="w-full rounded-ui border border-line bg-surface px-5 py-3.5 text-center text-sm font-medium text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
                   autoFocus
                 />
                 <button 
                   onClick={handleUnlock}
                   disabled={!password || isUnlocking}
                   className="system-button-primary flex w-full items-center justify-center gap-2"
                 >
                   {isUnlocking ? <Loader2 className="animate-spin" size={16} /> : <Unlock size={16} />} 
                   Unlock document
                 </button>
              </div>

              <button onClick={onProcess} className="system-button-link">
                Choose a different tool
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-10">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <LazyPage 
                  key={idx} 
                  pdfDoc={pdfDoc} 
                  pageNum={idx + 1} 
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fixed Status Bar */}
      <footer
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t border-line-soft bg-glass px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl backdrop-saturate-150"
        onClick={(e) => e.stopPropagation()}
      >
         <div className="flex items-center gap-2 text-xs text-muted">
            <span>{(file.size / (1024*1024)).toFixed(2)} MB</span>
            <span className="opacity-40">•</span>
            <span>PDF document</span>
         </div>
         <div className="text-xs font-medium text-ink">
            {currentPage} / {totalPages}
         </div>
      </footer>
    </div>,
    document.body
  )
}
