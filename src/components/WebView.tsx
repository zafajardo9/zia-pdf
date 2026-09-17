import { useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Check, Search, ShieldCheck, SlidersHorizontal, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Tool, ToolCategory } from '../types'

const categories: (ToolCategory | 'All')[] = ['All', 'Edit', 'Secure', 'Convert', 'Optimize']

const trustPoints = [
  'Runs entirely on your device',
  'No accounts, no uploads',
  'Open source, forever free',
]

function ToolCard({ title, desc, icon: Icon, category, onClick }: Tool & { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-44 flex-col rounded-panel border border-line-soft bg-surface p-6 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-outline focus-visible:border-accent"
    >
      <div className="mb-8 flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-ui bg-[var(--accent-soft)] text-accent">
          <Icon size={20} strokeWidth={1.6} />
        </span>
        <ArrowUpRight size={17} className="text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <div className="mt-auto">
        <span className="system-label mb-1.5 block">{category}</span>
        <h3 className="mb-1.5 text-[15px] font-medium tracking-[-0.01em]">{title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted">{desc}</p>
      </div>
    </button>
  )
}

export default function WebView({ tools, onFileSelect }: { tools: Tool[]; onFileSelect?: (file: File) => void }) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All'>('All')

  const filteredTools = useMemo(() => tools.filter((tool) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery = !query || tool.title.toLowerCase().includes(query) || tool.desc.toLowerCase().includes(query)
    return matchesQuery && (activeCategory === 'All' || tool.category === activeCategory)
  }), [tools, searchQuery, activeCategory])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelect?.(file)
          event.target.value = ''
        }}
      />

      {/* Hero — the one place the multicolor ribbon appears. */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div className="hero-ribbon" aria-hidden="true">
          <span className="hero-ribbon__band hero-ribbon__band--1" />
          <span className="hero-ribbon__band hero-ribbon__band--2" />
          <span className="hero-ribbon__band hero-ribbon__band--3" />
          <span className="hero-ribbon__band hero-ribbon__band--4" />
          <span className="hero-ribbon__band hero-ribbon__band--5" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-2 text-xs font-medium text-accent">
              <ShieldCheck size={16} />
              Private by default · Runs on your device
            </div>

            <h1 className="type-display max-w-xl text-ink">
              PDF work, without the upload.
            </h1>

            <p className="type-body-lg mt-6 max-w-xl text-muted">
              Merge, split, sign, compress, and convert documents directly in your browser.
              Nothing is sent to a server, and nothing is stored behind an account.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="system-button-primary flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Open a PDF
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('tool-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="system-button-secondary flex items-center justify-center gap-2"
              >
                Explore {tools.length} tools
              </button>
            </div>

            <ul className="mt-10 flex flex-col gap-2.5 text-xs text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check size={14} className="text-tertiary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <main id="tool-library" className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:px-8 md:pt-20">
        <section>
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-muted">
                <SlidersHorizontal size={16} />
                <span className="system-label">Tool library</span>
              </div>
              <h2 className="type-headline-lg max-w-md">
                The full toolkit.
              </h2>
              <p className="type-label-sm mt-3 text-muted" aria-live="polite">
                {filteredTools.length} of {tools.length} tools
              </p>
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <label className="block w-full md:w-80">
                <span className="sr-only">Find a tool</span>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
                  <input
                    type="search"
                    placeholder="Merge, compress, protect…"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-12 w-full rounded-ui border border-line bg-surface pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
                  />
                </div>
              </label>

              <div
                className="flex max-w-full gap-1 overflow-x-auto rounded-ui border border-line-soft bg-surface p-1"
                aria-label="Filter tools by category"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    aria-pressed={activeCategory === category}
                    className={`whitespace-nowrap rounded-[3px] px-3.5 py-2 text-xs font-medium transition-colors ${
                      activeCategory === category
                        ? 'bg-[var(--accent-soft)] text-accent'
                        : 'text-muted hover:bg-hover hover:text-ink'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.title} {...tool} onClick={() => navigate(tool.path || '/')} />
              ))}
            </div>
          ) : (
            <div className="system-surface py-20 text-center">
              <Search className="mx-auto mb-4 text-muted" size={28} strokeWidth={1.5} />
              <h3 className="type-headline-md">No tools found</h3>
              <p className="mt-2 text-sm text-muted">Try another term or reset the filters.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All') }}
                className="system-button-link mt-6"
              >
                Reset search
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
