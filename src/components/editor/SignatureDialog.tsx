import { useEffect, useRef, useState } from 'react'
import { Eraser, ImagePlus, PenLine, X } from 'lucide-react'
import { normalizeImageAsset } from '../../utils/editor/assets'
import { EditorAsset } from '../../utils/editor/types'

interface SignatureDialogProps {
  onClose: () => void
  onCreate: (asset: EditorAsset) => void
}

export default function SignatureDialog({ onClose, onCreate }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const drawingRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))
    const context = canvas.getContext('2d')
    context?.scale(dpr, dpr)
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const context = event.currentTarget.getContext('2d')
    const p = point(event)
    context?.beginPath(); context?.moveTo(p.x, p.y)
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const context = event.currentTarget.getContext('2d')
    const p = point(event)
    if (!context) return
    context.strokeStyle = '#111827'; context.lineWidth = 2.5; context.lineCap = 'round'; context.lineJoin = 'round'
    context.lineTo(p.x, p.y); context.stroke(); setHasInk(true)
  }
  const stop = () => { drawingRef.current = false }
  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }
  const useDrawing = () => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return
      onCreate(await normalizeImageAsset(blob, 'drawn-signature.png'))
    }, 'image/png')
  }
  const upload = async (file: File) => onCreate(await normalizeImageAsset(file, file.name))

  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="signature-title">
      <div className="w-full max-w-xl rounded-t-panel border border-line bg-elevated p-5 shadow-ambient sm:rounded-panel sm:p-6">
        <div className="flex items-start justify-between">
          <div><p className="system-label">Signature asset</p><h2 id="signature-title" className="mt-1 text-lg font-semibold">Draw or upload your signature</h2></div>
          <button onClick={onClose} aria-label="Close signature dialog" className="rounded-ui p-2 text-muted hover:bg-hover"><X size={18} /></button>
        </div>
        <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="mt-5 h-48 w-full touch-none rounded-ui border border-dashed border-line bg-white cursor-crosshair" aria-label="Signature drawing pad" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button onClick={clear} disabled={!hasInk} className="flex min-h-11 items-center justify-center gap-2 rounded-ui border border-line text-sm font-semibold text-muted hover:bg-hover disabled:opacity-40"><Eraser size={17} /> Clear</button>
          <button onClick={() => inputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-ui border border-line text-sm font-semibold hover:bg-hover"><ImagePlus size={17} /> Upload</button>
          <button onClick={useDrawing} disabled={!hasInk} className="system-button-primary col-span-2 flex items-center justify-center gap-2 sm:col-span-1"><PenLine size={17} /> Use signature</button>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file) }} />
      </div>
    </div>
  )
}

