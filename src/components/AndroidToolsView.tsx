import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, ChevronRight
} from 'lucide-react'
import { Tool, ToolCategory } from '../types'
import { BrandLogo } from './Logo'
import { BRAND } from '../config/brand'

export default function AndroidToolsView({ tools }: { tools: Tool[] }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const categoryColors: Record<ToolCategory, { bg: string, text: string, icon: string, border: string }> = {
    Edit: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', icon: 'text-accent', border: 'border-line' },
    Secure: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', icon: 'text-accent', border: 'border-line' },
    Convert: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', icon: 'text-accent', border: 'border-line' },
    Optimize: { bg: 'bg-[var(--accent-soft)]', text: 'text-accent', icon: 'text-accent', border: 'border-line' }
  }

  const filteredTools = useMemo(() => {
    return tools.filter(tool => 
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [tools, searchQuery])

  const groupedTools = useMemo(() => {
    return filteredTools.reduce((acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = []
      acc[tool.category].push(tool)
      return acc
    }, {} as Record<ToolCategory, Tool[]>)
  }, [filteredTools])

  return (
    <div className="min-h-screen bg-canvas pb-32 text-ink">
      <header className="px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-6">
        <p className="system-label mb-2">Local toolkit</p>
        <h1 className="mb-6 text-3xl font-semibold tracking-[-0.035em]">All tools</h1>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Search for a tool..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-ui border border-line bg-surface py-3.5 pl-12 pr-5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-[var(--focus)]"
          />
        </div>
      </header>

      <main className="px-4 space-y-8">
        {(Object.keys(groupedTools) as ToolCategory[]).map((category) => (
          <section key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="system-label mb-3 px-1">
              {category} Tools
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {groupedTools[category].map((tool, i) => {
                const colors = categoryColors[tool.category]
                const Icon = tool.icon
                return (
                  <button
                    key={i}
                    onClick={() => tool.implemented && tool.path && navigate(tool.path)}
                    className="flex items-center gap-4 rounded-panel border border-line bg-surface p-4 hover:border-accent/40 hover:bg-hover"
                  >
                    <div className={`w-12 h-12 ${colors.bg} ${colors.icon} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-bold text-sm dark:text-white truncate">{tool.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tool.desc}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      <footer className="text-center py-12 opacity-20">
         <BrandLogo size={24} className="mx-auto mb-4" />
         <p className="text-[9px] font-semibold uppercase tracking-[0.5em]">{BRAND.name} Version {BRAND.version}</p>
      </footer>
    </div>
  )
}
