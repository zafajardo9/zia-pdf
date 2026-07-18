import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

interface ToolHeaderProps {
  title: string
  highlight?: string
  description: string
}

export default function ToolHeader({ title, highlight, description }: ToolHeaderProps) {
  const navigate = useNavigate()
  const isNative = Capacitor.isNativePlatform()

  return (
    <div className="relative border-b border-line pb-6 text-left md:pb-8">
      {isNative && (
        <button 
          onClick={() => navigate('/')}
          aria-label="Back to home"
          className="absolute left-0 top-0 rounded-ui p-2 text-muted hover:bg-hover hover:text-accent md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <p className="system-label mb-2">Local PDF tool</p>
      <h2 className="mb-2 text-2xl font-semibold tracking-[-0.025em] md:text-3xl">
        {title} {highlight && <span className="text-accent">{highlight}.</span>}
      </h2>
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        {description}
      </p>
    </div>
  )
}
