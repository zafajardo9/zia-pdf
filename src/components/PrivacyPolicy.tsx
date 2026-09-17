/**
 * Zia-PDF - Privacy Protocol
 * Absolute data sovereignty and zero-telemetry specification.
 */

import { Shield, EyeOff, ServerOff, Database as DatabaseIcon, History as HistoryIcon, ExternalLink, Lock, Trash2, Cpu } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { NativeToolLayout } from './tools/shared/NativeToolLayout'
import { BrandLogo } from './Logo'
import { BRAND } from '../config/brand'

// --- WEB VERSION (TITAN HIGH-DENSITY) ---
const PrivacyWeb = () => {
  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-white p-6 md:p-12 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-8 bg-surface rounded-panel p-10 md:p-16 border border-line-soft shadow-card relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 text-accent opacity-5 pointer-events-none">
               <Shield size={300} strokeWidth={0.5} />
            </div>
            <div className="relative z-10">
              <div className="system-label inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-soft)] text-accent rounded-ui mb-6">
                <Shield size={12} /> Certified Local Engine
              </div>
              <h1 className="type-headline-lg text-ink leading-[1.05] mb-6">
                Architecture <br/>
                <span className="text-accent">of Silence.</span>
              </h1>
              <p className="type-body-lg text-muted max-w-lg">
                {BRAND.name} isn't just "private" by policy; it's private by architecture. We've eliminated the server entirely, ensuring that "No Data Found" is a technical reality, not just a promise.
              </p>
            </div>
          </div>

          <div className="md:col-span-4 bg-surface text-ink rounded-panel p-10 flex flex-col items-center justify-center text-center relative overflow-hidden border border-line-soft shadow-card">
             <div className="absolute top-0 right-0 p-6 text-accent opacity-5">
                <Lock size={120} />
             </div>
             <div className="w-16 h-16 bg-[var(--accent-soft)] text-accent rounded-xl2 flex items-center justify-center mb-6">
                <ServerOff size={32} />
             </div>
             <h2 className="type-headline-md text-ink relative z-10 mb-1 leading-none">Zero Server</h2>
             <p className="system-label text-accent relative z-10">Absolute Sovereignty</p>
          </div>
        </div>

        {/* Protocol Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-surface rounded-panel border border-line-soft shadow-card space-y-4">
            <div className="w-10 h-10 bg-[var(--accent-soft)] text-accent rounded-ui flex items-center justify-center">
              <Cpu size={20} />
            </div>
            <h3 className="type-label-md text-ink uppercase tracking-widest">RAM Processing</h3>
            <p className="type-body-md text-muted">
              Files are streamed into your browser's volatile memory (RAM). We do not use disk-based caching or temporary cloud storage.
            </p>
          </div>

          <div className="p-8 bg-surface rounded-panel border border-line-soft shadow-card space-y-4">
            <div className="w-10 h-10 bg-[var(--accent-soft)] text-accent rounded-ui flex items-center justify-center">
              <EyeOff size={20} />
            </div>
            <h3 className="type-label-md text-ink uppercase tracking-widest">Zero Telemetry</h3>
            <p className="type-body-md text-muted">
              No tracking pixels. No cookies. No user IDs. We have no way of knowing how many files you process or who you are.
            </p>
          </div>

          <div className="p-8 bg-surface rounded-panel border border-line-soft shadow-card space-y-4">
            <div className="w-10 h-10 bg-warning-soft text-warning rounded-ui flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <h3 className="type-label-md text-ink uppercase tracking-widest">Auto-Wipe</h3>
            <p className="type-body-md text-muted">
              Processing data is purged as soon as you close the tab. The only data that persists is your local configuration (stored in your browser).
            </p>
          </div>
        </div>

        {/* Integrity Footer */}
        <div className="p-10 bg-surface text-ink rounded-panel border border-line-soft shadow-card flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--accent-soft),transparent_60%)] pointer-events-none" />
           <div className="w-20 h-20 bg-[var(--accent-soft)] text-accent rounded-xl2 flex items-center justify-center shrink-0 border border-accent-outline">
              <HistoryIcon size={32} />
           </div>
           <div className="flex-1 text-center md:text-left relative z-10">
              <h3 className="type-headline-md text-ink mb-2">Local Persistence.</h3>
              <p className="type-body-lg text-muted mb-6 max-w-2xl">
                 Recent activity logs are stored exclusively in your browser's <span className="text-ink font-medium">IndexedDB</span>. This data never touches a network. You remain the sole custodian of your history.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                 <a href={BRAND.repositoryUrl} target="_blank" className="system-button-primary inline-flex items-center gap-2">
                    <Shield size={14} /> Audit Engine
                 </a>
              </div>
           </div>
        </div>

        <div className="pt-12 text-center opacity-30">
           <BrandLogo size={32} className="mx-auto mb-4" />
           <p className="system-label text-muted tracking-[0.5em]">Privacy Protocol v1.0.9 Stable</p>
        </div>
      </div>
    </div>
  )
}

// --- APK VERSION (TITAN MOBILE NATIVE) ---
const PrivacyAPK = () => {
  return (
    <NativeToolLayout title="Privacy" description="Data Security Spec" actions={null}>
      <div className="px-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4">
        
        {/* Status Card */}
        <div className="bg-surface rounded-panel p-6 border border-line-soft shadow-card flex items-center gap-5">
          <div className="w-14 h-14 bg-[var(--accent-soft)] text-accent rounded-xl2 flex items-center justify-center shrink-0">
            <Shield size={28} />
          </div>
          <div className="min-w-0">
            <h2 className="type-headline-md text-ink leading-none mb-1">Local Secure</h2>
            <p className="system-label text-accent">Zero-Server Enabled</p>
          </div>
        </div>

        {/* Protocol List */}
        <div className="bg-surface rounded-panel border border-line-soft shadow-card overflow-hidden divide-y divide-line-soft">
           <PrivacyItem 
             icon={ServerOff} 
             title="No Cloud Compute" 
             desc="All PDF logic runs on your phone's CPU. No document data is ever uploaded to any server." 
             color="text-accent bg-[var(--accent-soft)]"
           />
           <PrivacyItem 
             icon={EyeOff} 
             title="No Telemetry" 
             desc="We use zero tracking, analytics, or user identifiers. Your usage is completely invisible to us." 
             color="text-accent bg-[var(--accent-soft)]"
           />
           <PrivacyItem 
             icon={DatabaseIcon} 
             title="RAM Isolation" 
             desc="Documents stay in volatile memory. They vanish immediately when the application is closed." 
             color="text-warning bg-warning-soft"
           />
           <PrivacyItem 
             icon={HistoryIcon} 
             title="Local-Only Logs" 
             desc="History is stored in your device storage (IndexedDB) and can be cleared instantly in settings." 
             color="text-accent bg-[var(--accent-soft)]"
           />
        </div>

        {/* Pledge Card */}
        <div className="bg-surface text-ink rounded-panel border border-line-soft shadow-card p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-6 text-accent opacity-5">
              <Lock size={80} />
           </div>
           <h3 className="type-headline-md text-ink uppercase tracking-tight mb-3">Integrity Pledge</h3>
           <p className="type-body-md text-muted mb-6">
              {BRAND.name} is a transparent document workspace. We believe your data belongs to you, and we build tools that make that technically enforceable.
           </p>
           <a 
             href={BRAND.repositoryUrl}
             target="_blank" 
             className="system-button-primary w-full flex items-center justify-center gap-2 text-xs active:scale-95"
           >
              Audit Source Code <ExternalLink size={14} />
           </a>
        </div>

        <p className="system-label text-center tracking-[0.5em] pt-8">Handcrafted for Security</p>
      </div>
    </NativeToolLayout>
  )
}

const PrivacyItem = ({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) => (
  <div className="p-6 flex gap-5">
    <div className={`w-10 h-10 rounded-ui flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={20} strokeWidth={2.5} />
    </div>
    <div className="min-w-0">
      <h4 className="type-label-md text-ink uppercase tracking-tight mb-1">{title}</h4>
      <p className="type-label-sm text-muted">{desc}</p>
    </div>
  </div>
)

// --- MAIN ROUTER ---
export default function PrivacyPolicy() {
  const isNative = Capacitor.isNativePlatform()
  const isAndroidView = isNative || document.body.classList.contains('android-mode') || window.location.pathname.includes('android')

  return isAndroidView ? <PrivacyAPK /> : <PrivacyWeb />
}
