import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { EditorObject, EditorPage } from '../../utils/editor/types'

interface EditorCanvasProps {
  pdfDocument: any
  page: EditorPage
  objects: EditorObject[]
  selectedId: string | null
  assetUrls: Map<string, string>
  zoom: number
  onSelect: (id: string | null) => void
  onCommitPlacement: (id: string, changes: Partial<EditorObject>) => void
}

type Interaction = {
  id: string
  mode: 'move' | 'resize' | 'rotate'
  startX: number
  startY: number
  original: EditorObject
}

const fontFamily: Record<string, string> = {
  helvetica: 'Arial, Helvetica, sans-serif',
  times: 'Times New Roman, Times, serif',
  courier: 'Courier New, Courier, monospace',
}

export default function EditorCanvas({
  pdfDocument,
  page,
  objects,
  selectedId,
  assetUrls,
  zoom,
  onSelect,
  onCommitPlacement,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [interaction, setInteraction] = useState<Interaction | null>(null)
  const [preview, setPreview] = useState<EditorObject | null>(null)
  const renderTaskRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      if (!pdfDocument || !canvasRef.current) return
      renderTaskRef.current?.cancel?.()
      const pdfPage = await pdfDocument.getPage(page.index + 1)
      const viewport = pdfPage.getViewport({ scale: Math.min(window.devicePixelRatio || 1, 2) * 1.25 })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context || cancelled) return
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      const task = pdfPage.render({ canvasContext: context, viewport, intent: 'display' })
      renderTaskRef.current = task
      try { await task.promise } catch (error: any) {
        if (error?.name !== 'RenderingCancelledException') throw error
      }
    }
    render()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel?.()
    }
  }, [pdfDocument, page.index])

  useEffect(() => {
    if (!interaction) return
    const move = (event: PointerEvent) => {
      const rect = paperRef.current?.getBoundingClientRect()
      if (!rect) return
      const dx = (event.clientX - interaction.startX) / rect.width
      const dy = (event.clientY - interaction.startY) / rect.height
      const original = interaction.original
      if (interaction.mode === 'move') {
        setPreview({
          ...original,
          x: Math.max(0, Math.min(1 - original.width, original.x + dx)),
          y: Math.max(0, Math.min(1 - original.height, original.y + dy)),
        })
      } else if (interaction.mode === 'resize') {
        const width = Math.max(0.04, Math.min(1 - original.x, original.width + dx))
        const rawHeight = Math.max(0.025, Math.min(1 - original.y, original.height + dy))
        const height = original.type === 'text' ? rawHeight : width / original.aspectRatio * (rect.width / rect.height)
        setPreview({ ...original, width, height: Math.max(0.025, Math.min(1 - original.y, height)) })
      } else {
        const centerX = rect.left + (original.x + original.width / 2) * rect.width
        const centerY = rect.top + (original.y + original.height / 2) * rect.height
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90
        setPreview({ ...original, rotation: Math.round(angle) })
      }
    }
    const up = () => {
      if (preview) {
        onCommitPlacement(preview.id, {
          x: preview.x,
          y: preview.y,
          width: preview.width,
          height: preview.height,
          rotation: preview.rotation,
        })
      }
      setInteraction(null)
      setPreview(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    window.addEventListener('pointercancel', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [interaction, preview, onCommitPlacement])

  const begin = (event: React.PointerEvent, object: EditorObject, mode: Interaction['mode']) => {
    event.preventDefault()
    event.stopPropagation()
    onSelect(object.id)
    setPreview(object)
    setInteraction({ id: object.id, mode, startX: event.clientX, startY: event.clientY, original: object })
  }

  return (
    <div className="flex min-h-full items-start justify-center p-5 md:p-10" onPointerDown={() => onSelect(null)}>
      <div
        ref={paperRef}
        className="relative shrink-0 overflow-hidden bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/10"
        style={{
          aspectRatio: `${page.width} / ${page.height}`,
          width: `${page.width * zoom / 100}px`,
          maxWidth: 'none',
        }}
        aria-label={`PDF page ${page.index + 1}`}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {objects.map((sourceObject) => {
          const object = preview?.id === sourceObject.id ? preview : sourceObject
          const selected = selectedId === object.id
          const imageUrl = object.type === 'text' ? null : assetUrls.get(object.assetId)
          return (
            <div
              key={object.id}
              role="button"
              tabIndex={0}
              aria-label={`${object.type} object`}
              onPointerDown={(event) => begin(event, object, 'move')}
              onKeyDown={(event) => { if (event.key === 'Enter') onSelect(object.id) }}
              className={`absolute touch-none select-none ${selected ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-accent/50'}`}
              style={{
                left: `${object.x * 100}%`,
                top: `${object.y * 100}%`,
                width: `${object.width * 100}%`,
                height: `${object.height * 100}%`,
                opacity: object.opacity,
                transform: `rotate(${object.rotation}deg)`,
                transformOrigin: 'center',
                zIndex: object.zIndex,
                cursor: interaction?.id === object.id ? 'grabbing' : 'grab',
              }}
            >
              {object.type === 'text' ? (
                <div
                  className="h-full w-full overflow-hidden whitespace-pre-wrap break-words"
                  style={{
                    color: object.color,
                    fontFamily: fontFamily[object.fontFamily],
                    fontSize: `${object.fontSize * zoom / 100}px`,
                    fontWeight: object.fontStyle.includes('bold') || object.fontStyle.includes('Bold') ? 700 : 400,
                    fontStyle: object.fontStyle.toLowerCase().includes('italic') ? 'italic' : 'normal',
                    lineHeight: object.lineHeight,
                    textAlign: object.alignment,
                  }}
                >{object.text || 'Text'}</div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="" draggable={false} className="pointer-events-none h-full w-full object-fill" />
              ) : null}

              {selected && (
                <>
                  <button
                    type="button"
                    aria-label="Rotate object"
                    onPointerDown={(event) => begin(event, object, 'rotate')}
                    className="absolute -top-9 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-accent text-white shadow-md"
                  ><RotateCw size={13} /></button>
                  <button
                    type="button"
                    aria-label="Resize object"
                    onPointerDown={(event) => begin(event, object, 'resize')}
                    className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-sm border-2 border-white bg-accent shadow-md"
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
