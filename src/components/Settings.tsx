import { useState } from 'react'
import { 
  Trash2, Clock, Moon, Sun, Monitor,
  ChevronRight, Info, Zap, User, DownloadCloud, ListFilter,
  RotateCcw, ShieldCheck, Bug, Github, Settings2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearActivity } from '../utils/recentActivity'
import { toast } from 'sonner'
import { Theme } from '../types'
import { NativeToolLayout } from './tools/shared/NativeToolLayout'
import { BRAND } from '../config/brand'
import { hapticImpact } from '../utils/haptics'

// --- Custom UI Components ---

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onChange() }}
    className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${checked ? 'bg-accent' : 'bg-line-soft border border-line'}`}
  >
    <div className={`w-5 h-5 bg-surface rounded-full shadow-card transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
)

const SettingItem = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  action, 
  onClick,
  danger,
  iconColor
}: { 
  icon: any, 
  title: string, 
  subtitle?: string, 
  action?: React.ReactNode,
  onClick?: () => void,
  danger?: boolean,
  iconColor?: string
}) => {
  const Container = onClick ? 'button' : 'div'
  return (
    <Container 
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-4 border-b border-line-soft p-4 px-5 text-left transition-colors last:border-b-0 ${onClick ? 'active:bg-hover hover:bg-hover cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <div className={`w-10 h-10 rounded-ui flex items-center justify-center shrink-0 transition-colors ${danger ? 'bg-danger-soft text-danger' : (iconColor || 'bg-[var(--accent-soft)] text-accent')}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={`type-label-md truncate ${danger ? 'text-danger' : 'text-ink'}`}>{title}</h4>
          {subtitle && <p className="system-label mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        {action}
        {onClick && !action && <ChevronRight size={16} className="text-muted" />}
      </div>
    </Container>
  )
}

const SettingGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="system-label px-6 mb-2">{title}</h3>
    <div className="bg-surface rounded-panel border border-line-soft shadow-card overflow-hidden">
      {children}
    </div>
  </div>
)

export default function Settings({ theme, setTheme }: { theme: Theme, setTheme: (t: Theme) => void }) {
  const navigate = useNavigate()
  
  const [autoWipe, setAutoWipe] = useState(localStorage.getItem('autoWipe') === 'true')
  const [wipeTimer, setWipeTimer] = useState(localStorage.getItem('autoWipeTimer') || '15')
  const [haptics, setHaptics] = useState(localStorage.getItem('hapticsEnabled') === 'true')
  const [autoDownload, setAutoDownload] = useState(localStorage.getItem('autoDownload') === 'true')
  const [historyLimit, setHistoryLimit] = useState(localStorage.getItem('historyLimit') || '10')
  const [defaultAuthor, setDefaultAuthor] = useState(localStorage.getItem('defaultAuthor') || '')

  const handleToggle = (key: string, currentVal: boolean, setter: (v: boolean) => void) => {
    const newVal = !currentVal
    localStorage.setItem(key, String(newVal))
    setter(newVal)
    hapticImpact()
    toast.success(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} updated`)
  }

  const handleSelect = (key: string, val: string, setter: (v: string) => void) => {
    localStorage.setItem(key, val)
    setter(val)
    hapticImpact()
    toast.success('Configuration Saved')
  }

  const restoreDefaults = () => {
    if (confirm("Restore all settings to factory defaults?")) {
      localStorage.clear()
      localStorage.setItem('theme', 'system')
      window.location.reload()
    }
  }

  return (
    <NativeToolLayout title="System" description="Core Configuration" actions={null}>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-40">
        
        {/* Integrated Header */}
        <div className="flex items-center gap-4 px-2 mb-8 mt-2">
           <div className="w-11 h-11 rounded-ui flex items-center justify-center bg-[var(--accent-soft)] text-accent shrink-0">
              <Settings2 size={20} strokeWidth={1.8} />
           </div>
           <div>
              <h2 className="type-headline-md text-ink mb-1">Preferences</h2>
              <p className="system-label">Protocol v1.0.9 • Local</p>
           </div>
        </div>

        {/* Visual Interface */}
        <SettingGroup title="Interface">
          <div className="p-2 grid grid-cols-3 gap-2 border-b border-line-soft">
            {[
              { id: 'light', icon: Sun, label: 'Light' },
              { id: 'dark', icon: Moon, label: 'Dark' },
              { id: 'system', icon: Monitor, label: 'System' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as Theme)
                  hapticImpact()
                }}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-ui transition-colors border ${theme === t.id ? 'bg-[var(--accent-soft)] text-accent border-accent-outline' : 'bg-surface text-muted border-line-soft hover:bg-hover'}`}
              >
                <t.icon size={18} strokeWidth={2} />
                <span className="type-label-sm">{t.label}</span>
              </button>
            ))}
          </div>
          <SettingItem 
            icon={Zap} 
            title="Haptic Feedback" 
            subtitle="Tactile Response Engine"
            action={<ToggleSwitch checked={haptics} onChange={() => handleToggle('hapticsEnabled', haptics, setHaptics)} />}
          />
        </SettingGroup>

        {/* Workflow Automation */}
        <SettingGroup title="Workflow">
          <SettingItem 
            icon={DownloadCloud} 
            title="Auto-Download" 
            subtitle="Immediate result export"
            action={<ToggleSwitch checked={autoDownload} onChange={() => handleToggle('autoDownload', autoDownload, setAutoDownload)} />}
          />
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-ink">
               <User size={16} className="text-accent" />
               <span className="type-label-sm">Default Author Metadata</span>
            </div>
            <input 
              type="text"
              value={defaultAuthor}
              onChange={(e) => {
                setDefaultAuthor(e.target.value)
                localStorage.setItem('defaultAuthor', e.target.value)
              }}
              placeholder="e.g. zafajardo9"
              className="w-full rounded-ui border border-line bg-surface text-ink px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
            />
          </div>
        </SettingGroup>

        {/* Privacy Protocol */}
        <SettingGroup title="Privacy">
          <SettingItem 
            icon={Clock} 
            title="Auto-Wipe History" 
            subtitle="Automatic log destruction"
            action={<ToggleSwitch checked={autoWipe} onChange={() => handleToggle('autoWipe', autoWipe, setAutoWipe)} />}
          />
          {autoWipe && (
            <div className="px-5 py-3 flex items-center justify-between bg-[var(--accent-soft)] border-t border-line-soft">
               <span className="system-label text-accent">Wipe Delay</span>
               <select 
                value={wipeTimer}
                onChange={(e) => handleSelect('autoWipeTimer', e.target.value, setWipeTimer)}
                className="bg-transparent text-xs font-medium text-accent outline-none cursor-pointer text-right focus:ring-4 focus:ring-[var(--focus)] rounded-ui"
               >
                  <option value="0">Immediately</option>
                  <option value="1">After 1 Minute</option>
                  <option value="5">After 5 Minutes</option>
                  <option value="15">After 15 Minutes</option>
                  <option value="30">After 30 Minutes</option>
               </select>
            </div>
          )}
          <div className="px-5 py-4 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-ui flex items-center justify-center bg-[var(--accent-soft)] text-accent">
                  <ListFilter size={18} />
                </div>
                <div>
                  <h4 className="type-label-md text-ink">History Limit</h4>
                  <p className="system-label mt-1">Files to keep</p>
                </div>
             </div>
             <select 
              value={historyLimit}
              onChange={(e) => handleSelect('historyLimit', e.target.value, setHistoryLimit)}
              className="rounded-ui border border-line bg-surface text-ink px-3 py-2 text-xs outline-none cursor-pointer focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
             >
                <option value="5">5 Files</option>
                <option value="10">10 Files</option>
                <option value="20">20 Files</option>
                <option value="50">50 Files</option>
                <option value="999">Unlimited</option>
             </select>
          </div>
        </SettingGroup>

        {/* Ecosystem */}
        <SettingGroup title="Ecosystem">
          <SettingItem 
            icon={Github}
            title="Source Code" 
            subtitle="View on GitHub"
           
            onClick={() => window.open(BRAND.repositoryUrl, '_blank')}
          />
          <SettingItem 
            icon={Bug} 
            title="Report Issue" 
            subtitle="GitHub Tracker"
            onClick={() => window.open(BRAND.repositoryIssuesUrl, '_blank')}
          />
          <SettingItem 
            icon={Info} 
            title={`About ${BRAND.name}`}
            subtitle="Protocol Details"
            onClick={() => navigate('/about')}
          />
          <SettingItem 
            icon={ShieldCheck} 
            title="Privacy Protocol" 
            subtitle="Data Handling Spec"
            onClick={() => navigate('/privacy')}
          />
        </SettingGroup>

        {/* Danger Zone - Moved to absolute bottom */}
        <div className="mt-12">
           <h3 className="system-label px-6 mb-2 text-danger">Danger Zone</h3>
           <div className="bg-surface rounded-panel border border-danger-soft shadow-card overflow-hidden mb-4">
              <SettingItem 
                icon={RotateCcw} 
                title="Restore Defaults" 
                subtitle="Reset Preferences" 
                onClick={restoreDefaults}
               
              />
              <SettingItem 
                icon={Trash2} 
                title="Nuke All Data" 
                subtitle="Irreversible Wipedown" 
                danger
                onClick={async () => {
                  if(confirm("DANGER: This will permanently delete your history and reset all configuration. Proceed?")) {
                    await clearActivity()
                    localStorage.clear()
                    window.location.reload()
                  }
                }}
              />
           </div>
           <p className="system-label text-center text-muted opacity-60 mt-10">Configuration Engine v1.0.9 Stable</p>
        </div>

      </div>
    </NativeToolLayout>
  )
}
