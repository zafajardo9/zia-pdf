import { useState, useEffect } from 'react'
import { 
  Download as DownloadIcon, 
  Clock as HistoryIcon, Shield as ShieldIcon, Search as SearchIcon, FileText as FileTextIcon, ChevronRight as ChevronRightIcon, X as XIcon, Trash2 as Trash2Icon, Calendar as CalendarIcon, HardDrive as HardDriveIcon
} from 'lucide-react'
import { ActivityEntry, getRecentActivity, clearActivity } from '../utils/recentActivity'
import { toast } from 'sonner'

export default function AndroidHistoryView() {
  const [history, setHistory] = useState<ActivityEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const limitSetting = localStorage.getItem('historyLimit')
    const limit = limitSetting === '999' ? 100 : parseInt(limitSetting || '10')
    getRecentActivity(limit).then(setHistory)
  }, [])

  const handleClear = async () => {
    toast('Wipe all history?', {
      id: 'history-wipe-confirm',
      action: {
        label: 'Confirm',
        onClick: async () => {
          await clearActivity()
          setHistory([])
          toast.success('History wiped', { id: 'history-wipe-done' })
          toast.dismiss('history-wipe-confirm')
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => toast.dismiss('history-wipe-confirm')
      }
    })
  }

  const filteredHistory = history.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tool.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-canvas pb-32 text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-surface/92 px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col text-left">
            <p className="system-label mb-1">On this device</p>
            <h1 className="type-headline-lg">Activity</h1>
          </div>
          {history.length > 0 && (
            <button 
              onClick={handleClear}
              aria-label="Clear activity"
              className="rounded-ui border border-line bg-surface p-2 text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2Icon size={20} />
            </button>
          )}
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-muted group-focus-within:text-accent transition-colors">
            <SearchIcon size={18} />
          </div>
          <input 
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-ui border border-line bg-canvas py-3.5 pl-12 pr-6 text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-accent"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="px-4 py-6 space-y-2">
        {filteredHistory.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center animate-in fade-in duration-700">
            <div className="w-20 h-20 rounded-xl2 flex items-center justify-center text-muted mb-6 border border-line-soft">
              <HistoryIcon size={32} strokeWidth={1.5} />
            </div>
            <h3 className="type-headline-md text-ink">Everything Clear</h3>
            <p className="type-label-sm text-muted max-w-[200px] mt-2">Documents processed on this device will appear here temporarily.</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item.id} className="group flex items-center gap-4 rounded-panel border border-line-soft bg-surface p-4 hover:bg-hover">
              <div className="w-12 h-12 bg-[var(--accent-soft)] text-accent rounded-xl2 flex items-center justify-center shrink-0 transition-colors">
                <FileTextIcon size={22} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="type-label-md text-ink truncate mb-0.5">{item.name}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 type-label-sm text-muted bg-hover px-2 py-0.5 rounded-ui">
                    {item.tool}
                  </div>
                  <div className="flex items-center gap-1 type-label-sm text-muted">
                    <HardDriveIcon size={10} /> {formatSize(item.size)}
                  </div>
                  <div className="flex items-center gap-1 type-label-sm text-muted">
                    <CalendarIcon size={10} /> {formatDate(item.timestamp)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 {item.resultUrl && (
                    <a 
                      href={item.resultUrl} 
                      download={item.name} 
                      className="w-10 h-10 rounded-ui bg-[var(--accent-soft)] text-accent border border-accent-outline flex items-center justify-center hover:bg-accent-soft-strong active:scale-90 transition-all"
                    >
                      <DownloadIcon size={18} />
                    </a>
                 )}
                 <ChevronRightIcon size={16} className="text-muted" />
              </div>
            </div>
          ))
        )}

        <div className="pt-12 flex flex-col items-center gap-3 pb-10 opacity-30">
           <div className="flex items-center gap-2">
             <ShieldIcon size={14} className="text-tertiary" />
             <span className="system-label">Privacy Protocol</span>
           </div>
           <p className="type-label-sm text-muted max-w-[200px] text-center">
             Documents are processed locally in your private environment. Activity logs are stored on this device only.
           </p>
        </div>
      </main>
    </div>
  )
}
