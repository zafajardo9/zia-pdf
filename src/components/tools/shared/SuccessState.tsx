import { Download, Eye, CheckCircle2, Share2, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { downloadFile, shareFile } from '../../../utils/pdfHelpers'
import { Capacitor } from '@capacitor/core'
import { hapticSuccess } from '../../../utils/haptics'
import PdfPreview from '../../PdfPreview'

interface SuccessStateProps {
  message: string
  downloadUrl: string
  fileName: string
  onStartOver: () => void
  showPreview?: boolean
}

export default function SuccessState({ message, downloadUrl, fileName, onStartOver, showPreview = true }: SuccessStateProps) {
  const [internalPreviewFile, setInternalPreviewFile] = useState<File | null>(null)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    hapticSuccess()
    
    // Auto-Download Logic
    const shouldAutoDownload = localStorage.getItem('autoDownload') === 'true'
    if (shouldAutoDownload) {
      const triggerAutoDownload = async () => {
        try {
          const response = await fetch(downloadUrl)
          const blob = await response.blob()
          const buffer = await blob.arrayBuffer()
          const mimeType = fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf'
          await downloadFile(new Uint8Array(buffer), fileName, mimeType)
          toast.success(`Auto-saved as ${fileName}`)
        } catch (e) {
          console.error('Auto-download failed:', e)
        }
      }
      triggerAutoDownload()
    }
  }, [downloadUrl, fileName])

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      toast.loading(`Saving ${fileName}...`, { id: 'save-action' })
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const mimeType = fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf'
      
      await downloadFile(new Uint8Array(buffer), fileName, mimeType)
      toast.success(`Saved to Documents as ${fileName}`, { id: 'save-action' })
    } catch (err) {
      toast.error('Failed to save file', { id: 'save-action' })
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      toast.loading('Preparing to share...', { id: 'share-action' })
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const mimeType = fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf'
      
      await shareFile(new Uint8Array(buffer), fileName, mimeType)
      toast.dismiss('share-action')
    } catch (err) {
      toast.error('Failed to share file', { id: 'share-action' })
    }
  }

  const handlePreview = async () => {
    try {
      toast.loading('Loading preview...', { id: 'preview-load' })
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const mimeType = fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf'
      const file = new File([blob], fileName, { type: mimeType })
      setInternalPreviewFile(file)
      toast.dismiss('preview-load')
    } catch (e) {
      toast.error('Failed to open preview')
    }
  }

  return (
    <div className="space-y-5" role="status" aria-live="polite">
      {internalPreviewFile && (
        <PdfPreview 
          file={internalPreviewFile} 
          onClose={() => setInternalPreviewFile(null)} 
          onProcess={() => {
            const file = internalPreviewFile;
            setInternalPreviewFile(null);
            // Handoff to global Quick Drop selector after unmounting internal preview
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-quick-drop', { 
                detail: { file } 
              }))
            }, 100);
          }} 
        />
      )}

      <div className="flex items-center gap-3 rounded-panel border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
        <CheckCircle2 size={16} /> {message}
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {showPreview && (
            <button 
              onClick={handlePreview}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-ui border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-hover"
            >
              <Eye size={20} /> Preview
            </button>
          )}
          
          <button 
            onClick={handleShare}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-ui border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-hover"
          >
            <Share2 size={20} /> Share
          </button>
        </div>
        
        <button 
          onClick={handleDownload}
          className="system-button-primary flex w-full items-center justify-center gap-2"
        >
          <Download size={24} /> {isNative ? 'Save to Device' : 'Download'}
        </button>
      </div>

      <button 
        onClick={onStartOver}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-ui px-4 py-3 text-xs font-semibold text-muted hover:bg-hover hover:text-accent"
      >
        <RotateCcw size={14} /> Start New Session
      </button>
    </div>
  )
}
