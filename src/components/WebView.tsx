import { useMemo, useState } from 'react'
import { ArrowUpRight, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Tool, ToolCategory } from '../types'

const categories: (ToolCategory | 'All')[] = ['All', 'Edit', 'Secure', 'Convert', 'Optimize']

function ToolCard({ title, desc, icon: Icon, category, onClick }: Tool & { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-44 flex-col rounded-panel border border-line bg-surface p-5 text-left hover:border-accent/50 hover:bg-elevated focus-visible:border-accent"
    >
      <div className="mb-8 flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-ui border border-line bg-canvas text-accent group-hover:border-accent/30 group-hover:bg-[var(--accent-soft)]">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <ArrowUpRight size={17} className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <div className="mt-auto">
        <span className="system-label mb-1 block">{category}</span>
        <h3 className="mb-1 text-[15px] font-semibold tracking-tight">{title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted">{desc}</p>
      </div>
    </button>
  )
}

export default function WebView({ tools }: { tools: Tool[] }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All'>('All')

  const filteredTools = useMemo(() => tools.filter((tool) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery = !query || tool.title.toLowerCase().includes(query) || tool.desc.toLowerCase().includes(query)
    return matchesQuery && (activeCategory === 'All' || tool.category === activeCategory)
  }), [tools, searchQuery, activeCategory])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
        <section className="grid gap-10 border-b border-line pb-12 md:grid-cols-[1fr_420px] md:items-end md:pb-14">
          <div>
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-accent">
              <ShieldCheck size={16} />
              Private by default · Runs on your device
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-6xl">
              Your quiet workspace for every PDF task.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted md:text-base">
              Edit, secure, convert, and optimize documents without uploads, accounts, or hidden processing.
            </p>
          </div>

          <label className="block">
            <span className="system-label mb-2 block">Find a tool</span>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="search"
                placeholder="Merge, compress, protect…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 w-full rounded-ui border border-line bg-surface pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
              />
            </div>
          </label>
        </section>

        <section className="pt-8">
          <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-muted" />
                <h2 className="text-lg font-semibold tracking-tight">Tool library</h2>
              </div>
              <p className="text-xs text-muted" aria-live="polite">{filteredTools.length} of {tools.length} tools</p>
            </div>

            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1" aria-label="Filter tools by category">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                  className={`whitespace-nowrap rounded-ui px-3.5 py-2 text-xs font-semibold ${activeCategory === category ? 'bg-accent text-white' : 'text-muted hover:bg-hover hover:text-ink'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.title} {...tool} onClick={() => navigate(tool.path || '/')} />
              ))}
            </div>
          ) : (
            <div className="system-surface py-20 text-center">
              <Search className="mx-auto mb-4 text-muted" size={28} strokeWidth={1.5} />
              <h3 className="text-base font-semibold">No tools found</h3>
              <p className="mt-1 text-sm text-muted">Try another term or reset the filters.</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('All') }} className="mt-5 rounded-ui px-4 py-2 text-sm font-semibold text-accent hover:bg-[var(--accent-soft)]">
                Reset search
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
