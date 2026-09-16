import { useEffect, useRef, useState } from 'react'
import { EditorPage } from '../../utils/editor/types'

const DEFAULT_ASPECT = '612 / 792'

const pageAspect = (page: EditorPage) => {
  const swapped = page.rotation === 90 || page.rotation === 270
  const width = swapped ? page.height : page.width
  const height = swapped ? page.width : page.height
  return width > 0 && height > 0 ? `${width} / ${height}` : DEFAULT_ASPECT
}

function PageThumbnail({ pdfDocument, page, active, onSelect }: { pdfDocument: any; page: EditorPage; active: boolean; onSelect: () => void }) {
  const hostRef = useRef<HTMLButtonElement>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    const host = hostRef.current
    if (!host || url) return
    let cancelled = false
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const pdfPage = await pdfDocument.getPage(page.index + 1)
      const viewport = pdfPage.getViewport({ scale: 0.28 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) return
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
      await pdfPage.render({ canvasContext: context, viewport, intent: 'display' }).promise
      if (!cancelled) setUrl(canvas.toDataURL('image/jpeg', .72))
      canvas.width = 0; canvas.height = 0
    }, { rootMargin: '160px' })
    observer.observe(host)
    return () => { cancelled = true; observer.disconnect() }
  }, [pdfDocument, page.index, url])

  useEffect(() => {
    if (active) hostRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <button
      ref={hostRef}
      onClick={onSelect}
      aria-label={`Go to page ${page.index + 1}`}
      aria-current={active ? 'page' : undefined}
      className={`group w-[4.5rem] shrink-0 rounded-ui border p-1.5 text-left transition-colors sm:w-20 lg:w-full ${active ? 'border-accent bg-[var(--accent-soft)]' : 'border-transparent hover:border-line hover:bg-hover'}`}
    >
      <div className="relative w-full overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-black/10" style={{ aspectRatio: pageAspect(page) }}>
        {url
          ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
          : <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">Loading</span>}
      </div>
      <span className={`mt-1.5 block truncate text-center text-[10px] font-semibold ${active ? 'text-accent' : 'text-muted'}`}>Page {page.index + 1}</span>
    </button>
  )
}

export default function PageStrip({ pdfDocument, pages, activePageIndex, onSelect }: { pdfDocument: any; pages: EditorPage[]; activePageIndex: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-start gap-2 overflow-x-auto overscroll-contain p-3 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
      {pages.map((page) => <PageThumbnail key={page.index} pdfDocument={pdfDocument} page={page} active={page.index === activePageIndex} onSelect={() => onSelect(page.index)} />)}
    </div>
  )
}
