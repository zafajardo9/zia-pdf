import { Heart as HeartIcon, Sparkles, Package } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { NativeToolLayout } from './tools/shared/NativeToolLayout'
import { BrandLogo } from './Logo'
import { BRAND } from '../config/brand'

export default function Thanks() {
  const isNative = Capacitor.isNativePlatform()

  const credits = [
    { name: 'pdf-lib', desc: 'Core document engine for local manipulation.' },
    { name: 'PDF.js', desc: 'High-performance PDF rendering and parsing.' },
    { name: 'Tesseract.js', desc: 'Fully localized OCR engine for image-to-text conversion.' },
    { name: 'JSZip', desc: 'Local file compression and bundling.' },
    { name: 'Lucide', desc: 'Beautifully crafted open-source icons.' },
    { name: 'Capacitor', desc: 'Native bridge for cross-platform mobile apps.' },
    { name: 'OpenCode', desc: 'Open-source AI coding assistant for the terminal.' },
    { name: 'Termux', desc: 'Mobile terminal for on-the-go development.' },
    { name: 'Gemini CLI', desc: 'AI assistance for architectural design.' },
  ]

  const content = (
    <div className="animate-in fade-in duration-700">
      <section className={isNative ? "mb-8 text-center py-2" : "mb-12 text-center"}>
        <div className="flex items-center justify-center gap-2 text-blue-500 font-semibold text-[9px] uppercase tracking-[0.4em] mb-4">
          <Sparkles size={12} /> Acknowledgments
        </div>
        <h2 className={isNative ? "text-3xl font-semibold tracking-tighter dark:text-white leading-tight mb-3" : "text-4xl md:text-6xl font-semibold tracking-tighter text-gray-900 dark:text-white leading-[1.1] mb-6"}>
          The <span className="text-blue-500">Supporters.</span>
        </h2>
        <p className="text-base md:text-lg text-gray-500 dark:text-zinc-400 leading-relaxed font-medium max-w-xl mx-auto px-4">
          Privacy tools shouldn't depend on uploading your files to someone else's server. {BRAND.name} proves that a full document engine can run entirely on your device — and these are the open-source projects and people that make it possible.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 mb-12">
        {/* Main Supporter Card / Hall of Fame - Compact */}
        <div className="p-10 bg-zinc-900 text-white rounded-xl border border-white/10 flex flex-col md:flex-row items-center gap-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 group-hover:scale-110 transition-transform duration-1000">
            <HeartIcon size={160} fill="currentColor" />
          </div>
          
          <div className="w-20 h-20 bg-blue-500 text-white rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20 animate-pulse relative z-10">
            <HeartIcon size={32} fill="currentColor" />
          </div>
          
          <div className="flex-1 text-center md:text-left relative z-10">
            <h3 className="text-3xl font-semibold tracking-tighter mb-2">Hall of Fame</h3>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-lg mb-3 mx-auto md:mx-0">
              {BRAND.name} is a self-funded labor of love — free, ad-free, and private. It stays that way because people believe private document tools are worth building.
            </p>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-lg mb-8 mx-auto md:mx-0">
              What we need: share {BRAND.name} with someone who values privacy, report bugs you find, and consider supporting the project. Supporters earn a permanent shout-out here.
            </p>
          </div>
        </div>

        {/* Technologies Grid - High Density */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {credits.map((credit) => (
            <div 
              key={credit.name} 
              className="group p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-white/5 hover:border-blue-500 transition-all shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-gray-50 dark:bg-black rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors text-gray-400 shrink-0 border border-transparent dark:border-white/5">
                  <Package size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs tracking-widest uppercase dark:text-white mb-0.5">
                    {credit.name}
                  </h3>
                  <p className="text-[9px] text-gray-500 dark:text-zinc-500 font-bold uppercase tracking-tight truncate">{credit.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-8 opacity-20">
         <BrandLogo size={24} className="mx-auto mb-4" />
         <p className="text-[8px] font-semibold uppercase tracking-[0.5em]">{BRAND.name} Protocol v{BRAND.version}</p>
      </footer>
    </div>
  )

  if (isNative) {
    return (
      <NativeToolLayout title="Credits" description="Hall of Fame & Ecosystem" actions={null}>
        <div className="pb-20">
          {content}
        </div>
      </NativeToolLayout>
    )
  }

  return (
    <div className="min-h-full bg-[#FAFAFA] dark:bg-black text-gray-900 dark:text-zinc-100 selection:bg-blue-500 selection:text-white transition-colors duration-300">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {content}
      </main>
    </div>
  )
}
