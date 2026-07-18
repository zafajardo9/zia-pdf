import { Github } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { BRAND } from '../../../config/brand'

export default function PrivacyBadge() {
  // Only show this footer in the native APK version
  if (!Capacitor.isNativePlatform()) return null

  return (
    <div className="mt-12 flex flex-col items-center gap-5 border-t border-line pt-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
           <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Offline session active</span>
        </div>

        <div className="flex items-center gap-5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          <a href={BRAND.repositoryIssuesUrl} target="_blank" className="hover:text-blue-500 transition-colors flex items-center gap-2">
            <Github size={14} /> Support
          </a>
          <span className="opacity-20">•</span>
          <p className="opacity-70">Made by <span className="text-accent">{BRAND.authorName}</span></p>
        </div>
      </div>
    </div>
  )
}
