import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import ToolHeader from './ToolHeader'
import { useViewMode } from '../../../utils/viewModeContext'

interface NativeToolLayoutProps {
  title: string
  description: string
  children: React.ReactNode
  actions?: React.ReactNode
  onBack?: () => void
}

export const NativeToolLayout = ({ 
  title, 
  description, 
  children, 
  actions,
  onBack 
}: NativeToolLayoutProps) => {
  const navigate = useNavigate()
  const { viewMode } = useViewMode()
  
  // Determine if we should show the native-style header
  // It should only show if we are in Android/APK mode
  const isNative = Capacitor.isNativePlatform()
  const isAndroidView = isNative || viewMode === 'android' || document.body.classList.contains('android-mode') || window.location.pathname.includes('android')
  
  // A more reliable way is to check the layout context or simply use media queries 
  // but since we want to avoid double headers with the main Layout.tsx:
  const showNativeHeader = isAndroidView

  return (
    <div className="tool-workspace flex min-h-screen flex-col bg-canvas text-ink">
      {showNativeHeader && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 pb-1 pt-safe backdrop-blur-xl md:hidden">
          <div className="flex h-14 items-center gap-2">
            <button 
              onClick={onBack || (() => navigate(-1))}
              aria-label="Go back"
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-ui text-muted hover:bg-hover hover:text-ink"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="ml-1 text-base font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="w-10" />
        </header>
      )}

      <main className={`mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10 ${actions ? 'pb-32 md:pb-28' : ''}`}>
        <div className={`${showNativeHeader ? 'hidden md:block' : 'block'} mb-6 md:mb-8`}>
           <ToolHeader title={title} description={description} />
        </div>

        <div className="flex-1">
          {children}
        </div>
      </main>

      {actions && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
           <div className="mx-auto max-w-md px-4 pt-3">
             {actions}
           </div>
        </div>
      )}
    </div>
  )
}
