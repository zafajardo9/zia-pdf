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
  Download
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

const categoryColors: Record<ToolCategory, { bg: string, text: string, hover: string, iconBg: string }> = {
  Edit: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', hover: 'hover:bg-hover', iconBg: 'bg-canvas' },
  Secure: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', hover: 'hover:bg-hover', iconBg: 'bg-canvas' },
  Convert: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', hover: 'hover:bg-hover', iconBg: 'bg-canvas' },
  Optimize: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', hover: 'hover:bg-hover', iconBg: 'bg-canvas' }
}

export default function Layout({ children, theme, toggleTheme, tools, onFileDrop, viewMode }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDragging, setIsDragging] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isNative = Capacitor.isNativePlatform()
  const showMobileNav = isNative || viewMode === 'android'
  
  const isMobileBrowser = !isNative && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  useEffect(() => {
    if (showHistory) {
      getRecentActivity().then(setActivity)
    }
  }, [showHistory])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const activeTool = tools.find(t => {
    const pathPart = t.title.split(' ')[0].toLowerCase()
    return location.pathname.includes(`/${pathPart}`)
  })

  const isHome = location.pathname === '/'

  const isMainView = isHome || 
    location.pathname.endsWith('/android-tools') || 
    location.pathname.endsWith('/android-history') || 
    location.pathname.endsWith('/settings')

  const shouldShowNav = showMobileNav && isMainView && !activeTool

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-accent/10 backdrop-blur-sm">
          <div className="rounded-panel border border-dashed border-accent bg-surface p-10 shadow-ambient">
            <UploadIcon size={40} className="mx-auto text-accent" />
            <p className="mt-4 text-center text-sm font-semibold text-accent">Drop your PDF to begin</p>
          </div>
        </div>
      )}

      {/* Web Header */}
      {!showMobileNav && (
        <header className="sticky top-0 z-[100] flex h-16 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            {!isHome && (
              <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-gray-500 hover:text-blue-500 shrink-0"><ArrowLeftIcon size={20} /></button>
            )}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
              <BrandLogo size={Capacitor.isNativePlatform() ? 24 : 28} />
              <span className="hidden text-base font-semibold tracking-tight sm:block">{BRAND.name}</span>
            </Link>
            <div className="mx-1 h-5 w-px shrink-0 bg-line md:mx-2" />
            <div className="relative min-w-0" ref={dropdownRef}>
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} aria-expanded={isDropdownOpen} className={`flex min-w-0 items-center gap-2 rounded-ui px-2 py-1.5 text-xs font-semibold md:px-3 ${isDropdownOpen ? 'bg-accent text-white' : 'text-muted hover:bg-hover hover:text-ink'}`}>
                <span className="truncate">{isHome ? 'All Tools' : activeTool?.title || 'Tool'}</span>
                <ChevronDownIcon size={14} className={`transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 max-h-[80vh] w-72 overflow-y-auto rounded-panel border border-line bg-elevated py-3 shadow-ambient scrollbar-hide md:w-80">
                  {Object.entries(tools.filter(t => t.implemented).reduce((acc, tool) => { if (!acc[tool.category]) acc[tool.category] = []; acc[tool.category].push(tool); return acc }, {} as Record<string, Tool[]>)).map(([category, categoryTools]) => {
                    const colors = categoryColors[category as ToolCategory]
                    return (
                      <div key={category} className="mb-4">
                        <div className="px-6 py-2"><span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${colors.text} opacity-60`}>{category}</span></div>
                        <div className="grid grid-cols-1 gap-1 px-2">
                          {categoryTools.map((tool, i) => {
                            const Icon = tool.icon; const isActive = activeTool?.title === tool.title && !isHome
                            return (
                              <button key={i} onClick={() => { navigate(tool.path || '/'); setIsDropdownOpen(false); }} className={`flex items-center gap-4 p-3 rounded-lg transition-all text-left group ${isActive ? `${colors.bg} ${colors.text}` : `hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400`}`}>
                                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white dark:bg-zinc-800' : `${colors.iconBg} ${colors.text} opacity-70 group-hover:opacity-100`}`}><Icon size={18} /></div>
                                <div className="flex-1 min-w-0"><p className="text-xs font-semibold uppercase tracking-tight">{tool.title}</p><p className="text-[10px] opacity-60 truncate">{tool.desc}</p></div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            {isMobileBrowser && (
              <a 
                href={BRAND.repositoryReleasesUrl}
                target="_blank"
                className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-semibold uppercase tracking-widest shadow-sm active:scale-95 transition-all"
              >
                <Download size={14} strokeWidth={3} />
                Get APK
              </a>
            )}
            <Link to="/about" className={`p-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-semibold uppercase tracking-widest transition-all flex items-center gap-2 ${location.pathname.includes('about') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900'}`}>
              <InfoIcon size={18} />
              <span className="hidden sm:block">About</span>
            </Link>
            <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
              {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
            </button>
            <button onClick={() => setShowHistory(true)} className={`p-2 transition-colors relative ${showHistory ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}>
              <HistoryIcon size={20} />
              {activity.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white dark:border-black" />}
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 min-w-0 ${shouldShowNav ? 'pb-32' : ''}`}>
        {children}
      </main>

      {/* Web Footer - Modern Compact Design */}
      {!showMobileNav && (
        <footer className="relative z-10 mt-16 border-t border-line bg-surface">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12">
            
            <div className="grid grid-cols-2 md:grid-cols-12 gap-8 mb-12">
              
              {/* Brand Column (Span 6) */}
              <div className="col-span-2 md:col-span-6 space-y-4">
                <Link to="/" className="flex items-center gap-2.5 text-gray-900 dark:text-white group w-fit">
                  <BrandLogo size={22} />
                  <span className="font-bold tracking-tight text-lg group-hover:text-blue-500 transition-colors">{BRAND.name}</span>
                </Link>
                <p className="text-gray-500 dark:text-zinc-500 text-xs leading-relaxed max-w-sm">
                  The privacy-first PDF toolkit. 100% client-side logic. <br/>
                  Zero servers. Open source and forever free.
                </p>
                <div className="flex items-center gap-2 pt-1">
                   <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wide border border-emerald-100 dark:border-emerald-900/20">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      Live Engine
                   </div>
                   <a href={BRAND.repositoryUrl} target="_blank" className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-xl hover:bg-blue-500 hover:text-white transition-all text-gray-500 dark:text-zinc-500">
                     <GHIcon size={14} />
                   </a>
                </div>
              </div>

              {/* Legal Column */}
              <div className="col-span-1 md:col-span-3">
                <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-900 dark:text-white mb-4">Protocol</h4>
                <ul className="space-y-2.5 text-xs text-gray-500 dark:text-zinc-500">
                  <li><Link to="/about" className="hover:text-blue-500 transition-colors">About</Link></li>
                  <li><Link to="/privacy" className="hover:text-blue-500 transition-colors">Privacy Spec</Link></li>
                  <li><a href={BRAND.licenseUrl} target="_blank" className="hover:text-blue-500 transition-colors">License</a></li>
                </ul>
              </div>

              {/* Community Column */}
              <div className="col-span-1 md:col-span-3">
                <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-900 dark:text-white mb-4">Ecosystem</h4>
                <ul className="space-y-2.5 text-xs text-gray-500 dark:text-zinc-500">
                  <li><a href={BRAND.repositoryIssuesUrl} target="_blank" className="hover:text-blue-500 transition-colors">Report Bug</a></li>
                  <li><Link to="/thanks" className="hover:text-blue-500 transition-colors">Hall of Fame</Link></li>
                </ul>
              </div>

            </div>
            
            <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-400 dark:text-zinc-600 font-medium">
              <p>© {BRAND.copyrightYear} {BRAND.name} Project. No cookies used.</p>
              <div className="flex gap-6 items-center">
                 <a href="https://github.com/zafajardo9" target="_blank" className="hover:text-gray-900 dark:hover:text-white transition-colors">@zafajardo9</a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Titan Bottom Navigation (Solid, Grounded) */}
      {shouldShowNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-end justify-between border-t border-line bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
          <button 
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${location.pathname === '/' ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-600'}`}
          >
            <HomeIcon size={24} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button 
            onClick={() => navigate('/android-tools')}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${location.pathname === '/android-tools' ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-600'}`}
          >
            <LayoutGridIcon size={24} strokeWidth={location.pathname === '/android-tools' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Tools</span>
          </button>

          {/* Floating Action Button - Lifted */}
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
               className="flex h-12 w-12 items-center justify-center rounded-ui bg-accent text-white shadow-ambient ring-4 ring-surface active:scale-95"
             >
               <PlusIcon size={24} strokeWidth={2} />
             </button>
          </div>
          
          <button 
            onClick={() => navigate('/android-history')}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${location.pathname === '/android-history' ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-600'}`}
          >
            <HistoryIcon size={24} strokeWidth={location.pathname === '/android-history' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">History</span>
          </button>

          <Link 
            to="/settings"
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all no-underline ${location.pathname.includes('settings') ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-600'}`}
          >
            <SettingsIcon size={24} strokeWidth={location.pathname.includes('settings') ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Settings</span>
          </Link>
        </nav>
      )}

      {/* Sidebar History Drawer */}
      <aside className={`fixed top-0 right-0 h-screen w-full sm:w-80 bg-white dark:bg-zinc-950 border-l border-gray-100 dark:border-zinc-800 z-[150] shadow-ambient transition-transform duration-500 ease-out transform ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-blue-500" size={24} />
              <h2 className="text-xl font-semibold dark:text-white">Activity</h2>
            </div>
            <div className="flex items-center gap-2">
              {activity.length > 0 && (
                <button 
                  onClick={async () => { await clearActivity(); setActivity([]); }}
                  className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-xl transition-colors"
                >
                  <Trash2Icon size={18} />
                </button>
              )}
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                <ChevronRightIcon size={20} className="text-gray-400" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
            {activity.length === 0 ? (<div className="text-center py-20 opacity-40"><p className="text-xs font-bold uppercase tracking_widest text-gray-400">No recent files</p></div>) : (
              activity.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800 group relative">
                  <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg flex items-center justify-center"><CheckCircleIcon size={16} /></div><div className="flex-1 min-w-0"><p className="text-xs font-bold truncate dark:text-white">{item.name}</p><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-tighter">{item.tool}</p></div></div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold"><span>{new Date(item.timestamp).toLocaleTimeString()}</span>{item.resultUrl && (<a href={item.resultUrl} download={item.name} className="text-blue-500 hover:underline flex items-center gap-1"><DownloadIcon size={10} /> Redownload</a>)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
      {showHistory && (<div onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[140] animate-in fade-in duration-300" />)}
    </div>
  )
}
