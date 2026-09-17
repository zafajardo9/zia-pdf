import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { 
  Download as DownloadIcon, 
  Moon as MoonIcon, 
  Sun as SunIcon, 
  History as HistoryIcon, 
  Upload as UploadIcon, 
  ChevronRight as ChevronRightIcon, 
  ChevronDown as ChevronDownIcon,
  Plus as PlusIcon, 
  Trash2 as Trash2Icon, 
  CheckCircle2 as CheckCircleIcon, 
  Home as HomeIcon, 
  Info as InfoIcon, 
  ArrowLeft as ArrowLeftIcon,
  LayoutGrid as LayoutGridIcon, 
  Settings as SettingsIcon,
  Github as GHIcon,
  Download,
  X as XIcon
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Theme, Tool, ToolCategory, ViewMode } from '../types'
import { BrandLogo } from './Logo'
import { ActivityEntry, getRecentActivity, clearActivity } from '../utils/recentActivity'
import { hapticImpact } from '../utils/haptics'
import { BRAND } from '../config/brand'

interface LayoutProps {
  children: React.ReactNode
  theme: Theme
  toggleTheme: () => void
  tools: Tool[]
  onFileDrop?: (files: FileList) => void
  viewMode: ViewMode
}

/* DESIGN.md keeps a single brand accent, so every category shares one treatment. */
const categoryTone = {
  bg: 'bg-[var(--accent-soft)]',
  text: 'text-accent',
  hover: 'hover:bg-hover',
  iconBg: 'bg-hover',
}

export default function Layout({ children, theme, toggleTheme, tools, onFileDrop, viewMode }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDragging, setIsDragging] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const toolsDialogRef = useRef<HTMLDivElement>(null)
  const isNative = Capacitor.isNativePlatform()
  const showMobileNav = isNative || viewMode === 'android'
  
  const isMobileBrowser = !isNative && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  useEffect(() => {
    if (showHistory) {
      getRecentActivity().then(setActivity)
    }
  }, [showHistory])

  useEffect(() => {
    if (!showTools) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTools(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    toolsDialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showTools])

  useEffect(() => {
    // Disable global drop on mobile to prevent accidental triggers/bugs
    if (Capacitor.isNativePlatform()) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (onFileDrop) setIsDragging(true)
    }
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragging(false)
      }
    }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (onFileDrop && e.dataTransfer?.files) {
        onFileDrop(e.dataTransfer.files)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onFileDrop])

  const activeTool = tools.find((tool) => {
    const toolPath = tool.path?.split('?')[0]
    return toolPath && location.pathname === toolPath
  })

  const isHome = location.pathname === '/'

  const isMainView = isHome || 
    location.pathname.endsWith('/android-tools') || 
    location.pathname.endsWith('/android-history') || 
    location.pathname.endsWith('/settings')

  const shouldShowNav = showMobileNav && isMainView && !activeTool

  const implementedTools = tools.filter((tool) => tool.implemented)
  const groupedTools = Object.entries(
    implementedTools.reduce((acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = []
      acc[tool.category].push(tool)
      return acc
    }, {} as Record<string, Tool[]>)
  ) as [ToolCategory, Tool[]][]

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-[#0a2540]/25 backdrop-blur-[2px]">
          <div className="rounded-panel border border-dashed border-accent bg-surface p-10 shadow-menu">
            <UploadIcon size={36} strokeWidth={1.6} className="mx-auto text-accent" />
            <p className="mt-4 text-center text-sm font-medium text-accent">Drop your PDF to begin</p>
          </div>
        </div>
      )}

      {/* Web Header */}
      {!showMobileNav && (
        <header className="sticky top-0 z-[100] flex h-16 items-center justify-between border-b border-line-soft bg-glass px-4 backdrop-blur-xl backdrop-saturate-150 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
            {!isHome && (
              <button
                onClick={() => navigate('/')}
                aria-label="Back to home"
                className="-ml-1 shrink-0 rounded-ui p-2 text-muted transition-colors hover:bg-hover hover:text-accent"
              >
                <ArrowLeftIcon size={18} />
              </button>
            )}
            <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80">
              <BrandLogo size={Capacitor.isNativePlatform() ? 24 : 26} />
              <span className="hidden text-[15px] font-medium tracking-[-0.01em] sm:block">{BRAND.name}</span>
            </Link>
            <div className="mx-1 h-5 w-px shrink-0 bg-line-soft md:mx-2" />
            <div className="min-w-0">
              <button
                onClick={() => setShowTools(true)}
                aria-haspopup="dialog"
                aria-expanded={showTools}
                className={`flex min-w-0 items-center gap-2 rounded-ui px-2.5 py-1.5 text-xs font-medium md:px-3 ${showTools ? 'bg-[var(--accent-soft)] text-accent' : 'text-muted hover:bg-hover hover:text-ink'}`}
              >
                <span className="truncate">{isHome ? 'All tools' : activeTool?.title || 'Tool'}</span>
                <ChevronDownIcon size={14} className={`shrink-0 transition-transform duration-300 ${showTools ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            {isMobileBrowser && (
              <a 
                href={BRAND.repositoryReleasesUrl}
                target="_blank"
                className="hidden xs:flex items-center gap-2 rounded-ui bg-inverse px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-on-inverse transition-all active:scale-95"
              >
                <Download size={13} />
                Get APK
              </a>
            )}
            <Link
              to="/about"
              className={`flex items-center gap-2 rounded-ui p-2 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors md:px-3 md:py-1.5 md:text-[11px] ${location.pathname.includes('about') ? 'bg-[var(--accent-soft)] text-accent' : 'text-muted hover:bg-hover hover:text-ink'}`}
            >
              <InfoIcon size={17} />
              <span className="hidden sm:block">About</span>
            </Link>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-ui p-2 text-muted transition-colors hover:bg-hover hover:text-accent"
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
            <button
              onClick={() => setShowHistory(true)}
              aria-label="Recent activity"
              className={`relative rounded-ui p-2 transition-colors ${showHistory ? 'bg-[var(--accent-soft)] text-accent' : 'text-muted hover:bg-hover hover:text-accent'}`}
            >
              <HistoryIcon size={18} />
              {activity.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 min-w-0 ${shouldShowNav ? 'pb-32' : ''}`}>
        {children}
      </main>

      {/* Web Footer */}
      {!showMobileNav && (
        <footer className="relative z-10 mt-20 border-t border-line-soft bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
            
            <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-12">
              
              {/* Brand Column */}
              <div className="col-span-2 space-y-4 md:col-span-6">
                <Link to="/" className="group flex w-fit items-center gap-2.5">
                  <BrandLogo size={22} />
                  <span className="text-lg font-medium tracking-[-0.01em] transition-colors group-hover:text-accent">{BRAND.name}</span>
                </Link>
                <p className="max-w-sm text-xs leading-relaxed text-muted">
                  The privacy-first PDF toolkit. 100% client-side logic. <br/>
                  Zero servers. Open source and forever free.
                </p>
                <div className="flex items-center gap-3 pt-1">
                   <span className="flex items-center gap-2 text-[11px] text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                      Local engine active
                   </span>
                   <a
                     href={BRAND.repositoryUrl}
                     target="_blank"
                     aria-label="Source repository"
                     className="rounded-ui p-2 text-muted transition-colors hover:bg-hover hover:text-accent"
                   >
                     <GHIcon size={14} />
                   </a>
                </div>
              </div>

              {/* Legal Column */}
              <div className="col-span-1 md:col-span-3">
                <h4 className="system-label mb-4">Protocol</h4>
                <ul className="space-y-3 text-xs text-muted">
                  <li><Link to="/about" className="transition-colors hover:text-accent">About</Link></li>
                  <li><Link to="/privacy" className="transition-colors hover:text-accent">Privacy spec</Link></li>
                  <li><a href={BRAND.licenseUrl} target="_blank" className="transition-colors hover:text-accent">License</a></li>
                </ul>
              </div>

              {/* Community Column */}
              <div className="col-span-1 md:col-span-3">
                <h4 className="system-label mb-4">Ecosystem</h4>
                <ul className="space-y-3 text-xs text-muted">
                  <li><a href={BRAND.repositoryIssuesUrl} target="_blank" className="transition-colors hover:text-accent">Report a bug</a></li>
                  <li><Link to="/thanks" className="transition-colors hover:text-accent">Hall of fame</Link></li>
                </ul>
              </div>

            </div>
            
            <div className="flex flex-col items-center justify-between gap-4 border-t border-line-soft pt-6 text-[11px] text-muted md:flex-row">
              <p>© {BRAND.copyrightYear} {BRAND.name} Project. No cookies used.</p>
              <div className="flex items-center gap-6">
                 <a href="https://github.com/zafajardo9" target="_blank" className="transition-colors hover:text-accent">@zafajardo9</a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile bottom navigation */}
      {shouldShowNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-end justify-between border-t border-line-soft bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
          <button 
            onClick={() => navigate('/')}
            className={`flex flex-1 flex-col items-center gap-1.5 transition-all ${location.pathname === '/' ? 'text-accent' : 'text-muted'}`}
          >
            <HomeIcon size={23} strokeWidth={location.pathname === '/' ? 2.2 : 1.7} />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button 
            onClick={() => navigate('/android-tools')}
            className={`flex flex-1 flex-col items-center gap-1.5 transition-all ${location.pathname === '/android-tools' ? 'text-accent' : 'text-muted'}`}
          >
            <LayoutGridIcon size={23} strokeWidth={location.pathname === '/android-tools' ? 2.2 : 1.7} />
            <span className="text-[10px] font-medium">Tools</span>
          </button>

          {/* Floating action button */}
          <div className="relative -top-5">
             <button 
               onClick={() => {
                 hapticImpact()
                 const input = document.createElement('input')
                 input.type = 'file'
                 input.accept = '.pdf'
                 input.onchange = (e) => {
                   const file = (e.target as HTMLInputElement).files?.[0]
                   if (file) onFileDrop?.([file] as any)
                 }
                 input.click()
               }}
               aria-label="Open a PDF"
               className="flex h-12 w-12 items-center justify-center rounded-ui bg-accent text-white shadow-card ring-4 ring-surface active:scale-95"
             >
               <PlusIcon size={23} strokeWidth={1.8} />
             </button>
          </div>
          
          <button 
            onClick={() => navigate('/android-history')}
            className={`flex flex-1 flex-col items-center gap-1.5 transition-all ${location.pathname === '/android-history' ? 'text-accent' : 'text-muted'}`}
          >
            <HistoryIcon size={23} strokeWidth={location.pathname === '/android-history' ? 2.2 : 1.7} />
            <span className="text-[10px] font-medium">History</span>
          </button>

          <Link 
            to="/settings"
            className={`flex flex-1 flex-col items-center gap-1.5 no-underline transition-all ${location.pathname.includes('settings') ? 'text-accent' : 'text-muted'}`}
          >
            <SettingsIcon size={23} strokeWidth={location.pathname.includes('settings') ? 2.2 : 1.7} />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </nav>
      )}

      {/* All Tools Dialog */}
      {showTools && (
        <div
          onClick={() => setShowTools(false)}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-[#0a2540]/35 backdrop-blur-[2px] motion-safe:animate-fade-in sm:items-center sm:p-6"
        >
          <div
            ref={toolsDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-tools-dialog-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-panel border border-line-soft bg-elevated pb-[env(safe-area-inset-bottom)] shadow-menu outline-none motion-safe:animate-dialog-in sm:max-h-[85vh] sm:rounded-panel sm:pb-0"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line-soft px-5 py-4">
              <div className="min-w-0">
                <p className="system-label mb-1">PDF toolkit</p>
                <h2 id="all-tools-dialog-title" className="truncate text-base font-medium">All {implementedTools.length} tools</h2>
              </div>
              <button
                onClick={() => setShowTools(false)}
                aria-label="Close tool list"
                className="rounded-ui p-2 text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                <XIcon size={19} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6">
              {groupedTools.map(([category, categoryTools]) => {
                return (
                  <section key={category} className="mb-7 last:mb-0">
                    <div className="mb-3 flex items-center gap-3 px-1">
                      <span className="system-label">{category}</span>
                      <span className="h-px flex-1 bg-line-soft" />
                      <span className="text-[11px] text-muted">{categoryTools.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryTools.map((tool) => {
                        const Icon = tool.icon
                        const isActive = activeTool?.title === tool.title && !isHome
                        return (
                          <button
                            key={tool.title}
                            onClick={() => { navigate(tool.path || '/'); setShowTools(false) }}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-start gap-3 rounded-ui p-3 text-left transition-colors ${isActive ? `${categoryTone.bg} ${categoryTone.text}` : 'text-muted hover:bg-hover hover:text-ink'}`}
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui ${isActive ? 'bg-surface' : `${categoryTone.iconBg} ${categoryTone.text}`}`}>
                              <Icon size={18} strokeWidth={1.7} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium">{tool.title}</span>
                              <span className="mt-0.5 block truncate text-[11px] opacity-70">{tool.desc}</span>
                            </span>
                            {isActive && <CheckCircleIcon size={15} className="mt-2 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-[11px] text-muted">
              <span>Every tool runs in your browser</span>
              <span className="hidden items-center gap-1.5 sm:flex">
                Press <kbd className="rounded-[3px] border border-line px-1.5 py-0.5 font-medium text-ink">Esc</kbd> to close
              </span>
            </footer>
          </div>
        </div>
      )}

      {/* History Drawer */}
      <aside className={`fixed right-0 top-0 z-[150] h-screen w-full transform border-l border-line-soft bg-surface shadow-menu transition-transform duration-500 ease-out sm:w-80 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-full flex-col p-6">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-accent" size={22} strokeWidth={1.7} />
              <h2 className="text-xl font-normal">Activity</h2>
            </div>
            <div className="flex items-center gap-1">
              {activity.length > 0 && (
                <button 
                  onClick={async () => { await clearActivity(); setActivity([]); }}
                  aria-label="Clear activity"
                  className="rounded-ui p-2 text-muted transition-colors hover:bg-hover hover:text-danger"
                >
                  <Trash2Icon size={17} />
                </button>
              )}
              <button
                onClick={() => setShowHistory(false)}
                aria-label="Close activity"
                className="rounded-ui p-2 text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                <ChevronRightIcon size={19} />
              </button>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide">
            {activity.length === 0 ? (
              <div className="py-20 text-center">
                <p className="system-label">No recent files</p>
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="group relative rounded-panel border border-line-soft bg-hover p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-ui bg-[var(--accent-soft)] text-accent">
                      <CheckCircleIcon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="system-label mt-0.5">{item.tool}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    {item.resultUrl && (
                      <a href={item.resultUrl} download={item.name} className="flex items-center gap-1 text-accent hover:underline">
                        <DownloadIcon size={11} /> Redownload
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
      {showHistory && (
        <div
          onClick={() => setShowHistory(false)}
          className="fixed inset-0 z-[140] bg-[#0a2540]/25 backdrop-blur-[2px] motion-safe:animate-fade-in"
        />
      )}
    </div>
  )
}
