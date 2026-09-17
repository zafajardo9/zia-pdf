/**
 * PaperKnife - About & Protocol Specification
 * Professional-grade technical details and sustainability protocol.
 */

import { useState } from 'react'
import { 
  Heart as HeartIcon, 
  Code as CodeIcon, 
  Cpu as CpuIcon, 
  Shield as ShieldIcon, 
  ChevronDown as ChevronDownIcon,
  ServerOff as ServerOffIcon,
  ChevronRight as ChevronRightIcon,
  Sparkles as SparklesIcon,
  HardDrive as DiskIcon,
  EyeOff as PrivacyIcon
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { NativeToolLayout } from './tools/shared/NativeToolLayout'
import { BrandLogo } from './Logo'
import { BRAND } from '../config/brand'
import { ViewMode } from '../types'

// --- UI COMPONENTS ---
const SpecItem = ({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden border-b border-line-soft last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="group flex w-full items-center justify-between py-5 text-left"
      >
        <div className="flex items-center gap-5">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl2 transition-colors ${isOpen ? 'bg-[var(--accent-soft)] text-accent' : 'bg-hover text-muted group-hover:text-accent'}`}>
            <Icon size={19} strokeWidth={1.7} />
          </div>
          <h4 className="text-xs uppercase tracking-[0.14em] text-ink md:text-sm">{title}</h4>
        </div>
        <div className={`rounded-ui p-2 transition-colors ${isOpen ? 'text-accent' : 'text-muted'}`}>
          <ChevronDownIcon size={18} className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="animate-in slide-in-from-top-4 pb-7 pl-16 pr-6 text-sm leading-relaxed text-muted md:text-base">
          {children}
        </div>
      )}
    </div>
  )
}

const Accent = ({ children }: { children: React.ReactNode }) => (
  <span className="text-accent">{children}</span>
)

// --- WEB VERSION (TITAN v1.2 EXPLANATORY) ---
const AboutWeb = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-canvas pb-24 text-ink selection:bg-accent selection:text-white">
      
      {/* 1. Impact Hero — editorial, left aligned */}
      <section className="border-b border-line-soft">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24">
          <div className="max-w-3xl">
            <p className="system-label mb-6">Why this exists</p>
            <h1 className="type-display">
              Privacy is a <br />
              <span className="text-accent">human right.</span>
            </h1>
            <p className="type-body-lg mt-6 max-w-xl text-muted">
              {BRAND.name} is an absolute document engine. No servers, no tracking, no compromises.
              We turn your browser into a self-contained document laboratory.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Sustainability */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-20">
        <div className="flex flex-col items-start gap-8 rounded-panel border border-line-soft bg-surface p-8 shadow-card md:flex-row md:items-center md:p-12">
           <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl2 bg-[var(--accent-soft)] text-accent">
              <HeartIcon size={28} strokeWidth={1.6} />
           </div>
           <div className="flex-1">
              <h3 className="type-headline-md mb-4">Why this is needed.</h3>
              <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                 Every day, sensitive documents — IDs, contracts, medical records — get uploaded to anonymous servers just to merge or compress a file. {BRAND.name} exists to end that trade-off: professional document tools that never let your files leave your device.
              </p>
              <p className="mb-7 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                 What we need to keep it that way: share {BRAND.name} with someone who values privacy, and consider supporting the project — every bit keeps the engine running.
              </p>
              <button onClick={() => navigate('/thanks')} className="system-button-primary flex items-center gap-2">
                 <SparklesIcon size={16} /> Hall of fame
              </button>
           </div>
        </div>
      </section>

      {/* 3. Specification */}
      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          
          {/* Narrative Column */}
          <div className="space-y-7 lg:col-span-5">
            <span className="system-label inline-flex rounded-ui border border-line-soft bg-surface px-2.5 py-1">
               Technical manifesto
            </span>
            <h2 className="type-headline-lg">
              Architecture of <br />
              <span className="text-accent">absolute sovereignty.</span>
            </h2>
            <p className="type-body-md text-muted">
              {BRAND.name} rejects the trade-off between convenience and privacy. We've built an engine that runs where the user is, ensuring your sensitive data never crosses a network boundary.
            </p>
            <div className="rounded-panel border border-line-soft bg-surface p-6 shadow-card">
               <h4 className="system-label mb-3 flex items-center gap-2 !text-tertiary">
                  <ServerOffIcon size={14} /> Zero infrastructure
               </h4>
               <p className="text-xs leading-relaxed text-muted">
                  We operate no backend. No databases. No file caches. {BRAND.name} is a static distribution of code that activates your browser's existing power.
               </p>
            </div>
          </div>

          {/* Accordion Column */}
          <div className="rounded-panel border border-line-soft bg-surface p-2 shadow-card md:p-6 lg:col-span-7">
             <SpecItem title="How it works" icon={CpuIcon} defaultOpen={true}>
                Every action is executed locally on your device's CPU. Using high-performance <Accent>Web Workers</Accent> and <Accent>WebAssembly</Accent>, {BRAND.name} loads your PDF into a sandboxed environment within your browser tab.
             </SpecItem>

             <SpecItem title="Data lifecycle" icon={PrivacyIcon}>
                Your documents live exclusively in your browser's <Accent>volatile memory (RAM)</Accent>. We do not use persistent storage or cookies for your file content. Once the tab is closed, the data is destroyed.
             </SpecItem>

             <SpecItem title="Deep metadata clean" icon={DiskIcon}>
                Our "Deep Clean" metadata protocol purges identifying strings like Producer, Creator, and XMP metadata that standard editors leave behind, ensuring your files are truly anonymous.
             </SpecItem>

             <SpecItem title="Radical transparency" icon={CodeIcon}>
                {BRAND.name} is <Accent>100% open source</Accent> under the <Accent>GNU AGPL v3</Accent> license. This gives you the right to audit every line of code and guarantees the engine remains free.
             </SpecItem>

             <SpecItem title="Privacy nodes" icon={ShieldIcon}>
                By processing documents on-device, every user acts as their own "Privacy Node." There is no central point of failure and no surveillance capability.
             </SpecItem>
          </div>

        </div>
      </section>

      {/* 4. Footer links */}
      <section className="mx-auto max-w-7xl border-t border-line-soft px-6 pt-12 md:px-8">
        <div className="mb-12 flex flex-wrap gap-8">
           <button onClick={() => navigate('/thanks')} className="system-button-link group">
              <SparklesIcon size={16} /> Credits <ChevronRightIcon size={12} className="opacity-50 transition-transform group-hover:translate-x-1" />
           </button>
        </div>
        
        <div className="pb-4 opacity-40 transition-opacity duration-700 hover:opacity-80">
          <BrandLogo size={30} className="mb-4" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Zackery Alline Fajardo</p>
        </div>
      </section>

    </div>
  )
}


// --- APK VERSION (TITAN MOBILE OVERHAUL - PROTOCOL EXPLAINER) ---
const AboutAPK = () => {
  const navigate = useNavigate()
  return (
    <NativeToolLayout title="Protocol" description="System Internals" actions={null}>
      <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 px-4 pb-32 duration-700">
        
        {/* 1. App Identity */}
        <div className="flex flex-col items-center rounded-panel border border-line-soft bg-surface p-6 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl2 bg-hover">
            <BrandLogo size={40} />
          </div>
          <h2 className="type-headline-md mb-1">{BRAND.name}</h2>
          <p className="text-[10px] uppercase tracking-[0.14em] text-accent">v1.0.9 stable · absolute privacy</p>
        </div>

        {/* 2. Why This Is Needed */}
        <div className="rounded-panel border border-line-soft bg-surface p-6 shadow-card">
           <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-ui bg-[var(--accent-soft)] text-accent">
                 <HeartIcon size={19} strokeWidth={1.7} />
              </div>
              <h3 className="text-base">Why this is needed</h3>
           </div>
           <p className="mb-3 text-sm leading-relaxed text-muted">
              Sensitive documents shouldn't have to be uploaded to anonymous servers just to merge or compress a file. {BRAND.name} keeps every operation on your device — nothing leaves your hands.
           </p>
           <p className="mb-6 text-sm leading-relaxed text-muted">
              What we need: share {BRAND.name} with someone who values privacy, and consider supporting the project to keep it free.
           </p>
           <button onClick={() => navigate('/thanks')} className="system-button-primary flex w-full items-center justify-center gap-2">
              Hall of fame
           </button>
        </div>

        {/* 3. Explainer Protocol */}
        <div className="overflow-hidden rounded-panel border border-line-soft bg-surface">
           <div className="border-b border-line-soft p-4">
              <h3 className="system-label">System internal specification</h3>
           </div>
           
           <div className="divide-y divide-[var(--border-soft)] px-2">
              <SpecItem title="How it works" icon={CpuIcon}>
                Every action you perform—merging, splitting, or encrypting—happens locally on your device's CPU. {BRAND.name} uses an internal local engine powered by <Accent>pdf-lib</Accent> and <Accent>WebAssembly</Accent>. No data ever leaves your hardware.
              </SpecItem>

              <SpecItem title="Data privacy" icon={PrivacyIcon}>
                Your files are loaded into the app's <Accent>volatile memory (RAM)</Accent> only during your active session. We do not use persistent storage for your PDF content. Once you close the app or navigate away, the processed document is permanently purged.
              </SpecItem>

              <SpecItem title="Deep metadata clean" icon={DiskIcon}>
                Privacy isn't just about servers. Most tools leave digital breadcrumbs in the PDF metadata. {BRAND.name}'s "Deep Clean" protocol sanitizes every document, purging Producer, Creator, and XMP metadata to ensure absolute anonymity.
              </SpecItem>

              <SpecItem title="Open source integrity" icon={CodeIcon}>
                Trust is earned through transparency. {BRAND.name} is <Accent>100% open-source</Accent> under the <Accent>GNU AGPL v3</Accent> license. This ensures the engine remains free, auditable, and community-driven forever.
              </SpecItem>

              <SpecItem title="Zero infrastructure" icon={ServerOffIcon}>
                We operate a <Accent>Zero-Server Architecture</Accent>. We have no backend, no database, and no cloud. Your phone is the laboratory, and your documents stay in your hands alone.
              </SpecItem>
           </div>
        </div>

        {/* 4. Action Tiles */}
        <div className="grid grid-cols-1 gap-2 pt-2">
          <button onClick={() => navigate('/thanks')} className="flex items-center justify-between rounded-panel border border-line-soft bg-surface p-5 transition-all hover:bg-hover active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-ui bg-[var(--accent-soft)] text-accent">
                   <SparklesIcon size={19} strokeWidth={1.7} />
                </div>
                <div className="text-left">
                   <h4 className="text-sm">Credits</h4>
                   <p className="system-label mt-0.5">Hall of fame</p>
                </div>
              </div>
              <ChevronRightIcon size={16} className="text-muted" />
          </button>
        </div>

        <p className="pt-8 pb-4 text-center text-[9px] uppercase tracking-[0.4em] text-muted">Handcrafted by Zackery Alline Fajardo</p>
      </div>
    </NativeToolLayout>
  )
}

// --- MAIN ROUTER ---
export default function About({ viewMode }: { viewMode?: ViewMode }) {
  const isAndroid = viewMode === 'android' || (viewMode === undefined && Capacitor.isNativePlatform())
  return isAndroid ? <AboutAPK /> : <AboutWeb />
}
