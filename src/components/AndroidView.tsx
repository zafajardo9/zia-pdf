import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, History, Layers, Lock, Moon, Scissors, ShieldCheck, Sun, Upload, Zap } from 'lucide-react'
import { ActivityEntry, getRecentActivity } from '../utils/recentActivity'
import { BrandLogo } from './Logo'
import { BRAND } from '../config/brand'

interface AndroidViewProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  onFileSelect?: (file: File) => void
}

const quickActions = [
  { title: 'Merge', description: 'Combine files', icon: Layers, path: '/merge' },
  { title: 'Compress', description: 'Reduce size', icon: Zap, path: '/compress' },
  { title: 'Split', description: 'Extract pages', icon: Scissors, path: '/split' },
  { title: 'Protect', description: 'Add a password', icon: Lock, path: '/protect' },
]

export default function AndroidView({ theme, toggleTheme, onFileSelect }: AndroidViewProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [history, setHistory] = useState<ActivityEntry[]>([])

  useEffect(() => { getRecentActivity(3).then(setHistory) }, [])

  return (
    <div className="min-h-screen bg-canvas pb-28 text-ink">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelect?.(file)
        }}
      />

      <header className="sticky top-0 z-40 border-b border-line bg-surface/92 px-5 pb-2 pt-safe backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={23} />
            <div>
              <p className="text-[15px] font-semibold tracking-tight">{BRAND.name}</p>
              <p className="text-[9px] font-medium text-muted">Private PDF workspace</p>
            </div>
          </div>
          <button onClick={toggleTheme} aria-label="Toggle theme" className="flex h-10 w-10 items-center justify-center rounded-ui border border-line bg-surface text-muted hover:bg-hover">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="space-y-8 px-4 py-6">
        <section className="rounded-panel border border-line bg-surface p-5">
          <div className="mb-9 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-ui bg-[var(--accent-soft)] text-accent">
              <Upload size={20} />
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted"><ShieldCheck size={13} className="text-emerald-500" /> Stays on device</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">Open a PDF</h1>
          <p className="mt-2 text-sm leading-5 text-muted">Choose a document, then pick the tool you need.</p>
          <button onClick={() => fileInputRef.current?.click()} className="system-button-primary mt-5 flex w-full items-center justify-center gap-2">
            Select from device <ArrowRight size={16} />
          </button>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="system-label mb-1">Start quickly</p>
              <h2 className="text-lg font-semibold">Popular tools</h2>
            </div>
            <button onClick={() => navigate('/android-tools')} className="text-xs font-semibold text-accent">View all</button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map(({ title, description, icon: Icon, path }) => (
              <button key={title} onClick={() => navigate(path)} className="rounded-panel border border-line bg-surface p-4 text-left hover:border-accent/40 hover:bg-elevated">
                <Icon size={20} className="mb-6 text-accent" strokeWidth={1.8} />
                <span className="block text-sm font-semibold">{title}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{description}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="system-label mb-1">On this device</p>
              <h2 className="text-lg font-semibold">Recent activity</h2>
            </div>
            {history.length > 0 && <button onClick={() => navigate('/android-history')} className="text-xs font-semibold text-accent">View all</button>}
          </div>
          <div className="overflow-hidden rounded-panel border border-line bg-surface">
            {history.length > 0 ? history.map((item) => (
              <button key={item.id} onClick={() => navigate('/android-history')} className="flex w-full items-center gap-3 border-b border-line p-3.5 text-left last:border-0 hover:bg-hover">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-canvas text-muted"><FileText size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{item.name}</span>
                  <span className="mt-0.5 block text-[10px] text-muted">{item.tool} · {(item.size / 1048576).toFixed(2)} MB</span>
                </span>
                <ArrowRight size={15} className="text-muted" />
              </button>
            )) : (
              <div className="flex items-center gap-3 p-4 text-muted">
                <History size={18} />
                <p className="text-xs">Processed files will appear here temporarily.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
