import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { EditorObject, EditorProjectV1 } from '../../utils/editor/types'

interface EditorInspectorProps {
  project: EditorProjectV1
  selected: EditorObject | null
  onUpdate: (changes: Partial<EditorObject>) => void
  onDelete: () => void
  onDuplicate: () => void
  onReorder: (direction: 'forward' | 'backward') => void
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="system-label mb-2 block">{label}</span>
    {children}
  </label>
)

const numberValue = (value: string, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback

export default function EditorInspector({ project, selected, onUpdate, onDelete, onDuplicate, onReorder }: EditorInspectorProps) {
  if (!selected) {
    return (
      <div className="p-5">
        <p className="system-label">Properties</p>
        <div className="mt-8 text-center text-xs leading-5 text-muted">
          Select an object on the page to edit its content and appearance.
        </div>
        <div className="mt-8 border-t border-line pt-5">
          <p className="system-label">Document</p>
          <p className="mt-3 truncate text-sm font-semibold">{project.sourceName}</p>
          <p className="mt-1 text-xs text-muted">{project.pages.length} {project.pages.length === 1 ? 'page' : 'pages'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="system-label">Selected object</p>
          <p className="mt-1 text-sm font-semibold capitalize">{selected.type}</p>
        </div>
        <button onClick={onDelete} aria-label="Delete object" className="rounded-ui p-2 text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 size={17} /></button>
      </div>

      {selected.type === 'text' && (
        <>
          <Field label="Text">
            <textarea value={selected.text} rows={4} onChange={(event) => onUpdate({ text: event.target.value })} className="w-full resize-y px-3 py-2 text-sm" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Font">
              <select value={selected.fontFamily} onChange={(event) => onUpdate({ fontFamily: event.target.value as any })} className="h-10 w-full px-2 text-xs">
                <option value="helvetica">Helvetica</option><option value="times">Times</option><option value="courier">Courier</option>
              </select>
            </Field>
            <Field label="Style">
              <select value={selected.fontStyle} onChange={(event) => onUpdate({ fontStyle: event.target.value as any })} className="h-10 w-full px-2 text-xs">
                <option value="regular">Regular</option><option value="bold">Bold</option><option value="italic">Italic</option><option value="boldItalic">Bold italic</option>
              </select>
            </Field>
            <Field label="Size">
              <input type="number" min="6" max="144" value={selected.fontSize} onChange={(event) => onUpdate({ fontSize: numberValue(event.target.value, selected.fontSize) })} className="h-10 w-full px-3 text-xs" />
            </Field>
            <Field label="Color">
              <input type="color" value={selected.color} onChange={(event) => onUpdate({ color: event.target.value })} className="h-10 w-full p-1" />
            </Field>
          </div>
          <Field label="Alignment">
            <div className="grid grid-cols-3 gap-1 rounded-ui border border-line bg-canvas p-1">
              {(['left', 'center', 'right'] as const).map((alignment) => (
                <button key={alignment} onClick={() => onUpdate({ alignment })} className={`rounded-ui px-2 py-2 text-xs capitalize ${selected.alignment === alignment ? 'bg-accent text-white' : 'text-muted hover:bg-hover'}`}>{alignment}</button>
              ))}
            </div>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-ui border border-line p-3 text-xs font-semibold">
            Apply to all pages
            <input type="checkbox" checked={selected.scope.kind === 'all'} onChange={(event) => onUpdate({ scope: event.target.checked ? { kind: 'all' } : { kind: 'single', pageIndex: project.activePageIndex } })} className="h-4 w-4 accent-[var(--accent)]" />
          </label>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Rotation">
          <input type="number" min="-360" max="360" value={Math.round(selected.rotation)} onChange={(event) => onUpdate({ rotation: numberValue(event.target.value, selected.rotation) })} className="h-10 w-full px-3 text-xs" />
        </Field>
        <Field label="Opacity">
          <input type="number" min="10" max="100" value={Math.round(selected.opacity * 100)} onChange={(event) => onUpdate({ opacity: Math.max(.1, Math.min(1, numberValue(event.target.value, 100) / 100)) })} className="h-10 w-full px-3 text-xs" />
        </Field>
        <Field label="X position">
          <input type="number" min="0" max="100" value={Math.round(selected.x * 100)} onChange={(event) => onUpdate({ x: Math.max(0, Math.min(1 - selected.width, numberValue(event.target.value, 0) / 100)) })} className="h-10 w-full px-3 text-xs" />
        </Field>
        <Field label="Y position">
          <input type="number" min="0" max="100" value={Math.round(selected.y * 100)} onChange={(event) => onUpdate({ y: Math.max(0, Math.min(1 - selected.height, numberValue(event.target.value, 0) / 100)) })} className="h-10 w-full px-3 text-xs" />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line pt-5">
        <button onClick={onDuplicate} className="flex items-center justify-center gap-1 rounded-ui border border-line py-2 text-xs font-semibold hover:bg-hover"><Copy size={14} /> Copy</button>
        <button onClick={() => onReorder('forward')} aria-label="Bring forward" className="flex items-center justify-center rounded-ui border border-line py-2 hover:bg-hover"><ArrowUp size={15} /></button>
        <button onClick={() => onReorder('backward')} aria-label="Send backward" className="flex items-center justify-center rounded-ui border border-line py-2 hover:bg-hover"><ArrowDown size={15} /></button>
      </div>
    </div>
  )
}

