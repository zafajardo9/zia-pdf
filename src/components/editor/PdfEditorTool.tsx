import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ChevronDown,
  Download,
  FilePenLine,
  ImagePlus,
  Loader2,
  Lock,
  Minus,
  PenLine,
  Redo2,
  RotateCcw,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePipeline } from '../../utils/pipelineContext'
import { addActivity } from '../../utils/recentActivity'
import { downloadFile, getPdfMetaData, loadPdfDocument, unlockPdf } from '../../utils/pdfHelpers'
import { BRAND } from '../../config/brand'
import { normalizeImageAsset } from '../../utils/editor/assets'
import { exportEditorProject } from '../../utils/editor/exportPdf'
import { clearEditorProject, loadEditorProject, saveEditorProject } from '../../utils/editor/persistence'
import { editorReducer } from '../../utils/editor/state'
import {
  appliesToPage,
  createId,
  EDITOR_SCHEMA_VERSION,
  EditorAsset,
  EditorMode,
  EditorObject,
  EditorPage,
  EditorProjectV1,
  PersistedEditorProject,
  SignatureObject,
  TextObject,
} from '../../utils/editor/types'
import EditorCanvas from './EditorCanvas'
import EditorInspector from './EditorInspector'
import PageStrip from './PageStrip'
import SignatureDialog from './SignatureDialog'

const createProject = (file: File, pages: EditorPage[]): EditorProjectV1 => {
  const baseName = file.name.replace(/\.pdf$/i, '')
  const now = Date.now()
  return {
    schemaVersion: EDITOR_SCHEMA_VERSION,
    id: 'active',
    sourceName: file.name,
    sourceSize: file.size,
    sourceLastModified: file.lastModified,
    outputName: `${baseName}-edited.pdf`,
    pages,
    objects: [],
    selectedObjectId: null,
    activePageIndex: 0,
    createdAt: now,
    updatedAt: now,
  }
}

const readPages = async (pdfDocument: any): Promise<EditorPage[]> => {
  const pages: EditorPage[] = []
  for (let index = 0; index < pdfDocument.numPages; index++) {
    const page = await pdfDocument.getPage(index + 1)
    const viewport = page.getViewport({ scale: 1 })
    pages.push({ index, width: viewport.width, height: viewport.height, rotation: viewport.rotation || 0 })
  }
  return pages
}

const sanitizeOutputName = (name: string) => {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').trim() || `${BRAND.filePrefix}-edited`
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`
}

export default function PdfEditorTool() {
  const location = useLocation()
  const mode = (new URLSearchParams(location.search).get('mode') || 'default') as EditorMode
  const { consumePipelineFile } = usePipeline()
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const sourceBytesRef = useRef<ArrayBuffer | null>(null)
  const passwordRef = useRef('')

  const [history, dispatch] = useReducer(editorReducer, null)
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [assets, setAssets] = useState<EditorAsset[]>([])
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(new Map())
  const [recovery, setRecovery] = useState<PersistedEditorProject | null>(null)
  const [recoveryError, setRecoveryError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draftUnavailable, setDraftUnavailable] = useState(false)
  const [lockedFile, setLockedFile] = useState<File | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState(false)
  const project = history?.present || null

  useEffect(() => {
    loadEditorProject()
      .then(setRecovery)
      .catch((error) => setRecoveryError(error instanceof Error ? error.message : 'The saved draft could not be opened.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (!pipelined) return
    const file = new File([pipelined.buffer as BlobPart], pipelined.name, { type: 'application/pdf' })
    if (recovery) {
      if (!window.confirm('Replace the locally saved editor draft with this PDF?')) return
      clearEditorProject().catch(() => {})
      setRecovery(null)
    }
    openFile(file)
  // Pipeline is intentionally consumed once when the route mounts.
  }, [])

  useEffect(() => {
    const urls = new Map<string, string>()
    assets.forEach((asset) => urls.set(asset.id, URL.createObjectURL(asset.blob)))
    setAssetUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [assets])

  useEffect(() => {
    if (!project || !sourceBytesRef.current) return
    const timer = window.setTimeout(() => {
      setIsSaving(true)
      saveEditorProject({ project, sourceBytes: sourceBytesRef.current!.slice(0), assets })
        .then(() => setDraftUnavailable(false))
        .catch(() => {
          setDraftUnavailable(true)
          toast.error('Local recovery is unavailable. You can keep editing this session.')
        })
        .finally(() => setIsSaving(false))
    }, 750)
    return () => window.clearTimeout(timer)
  }, [project, assets])

  useEffect(() => {
    if (!project || project.objects.length || mode === 'default') return
    if (mode === 'signature') setSignatureOpen(true)
    if (mode === 'watermark') addText(true)
  // Apply a route preset only once to a fresh project.
  }, [project?.id, mode])

  const activate = async (file: File, pdf: any, existing?: EditorProjectV1, restoredAssets: EditorAsset[] = [], password = '') => {
    sourceBytesRef.current = await file.arrayBuffer()
    passwordRef.current = password
    const nextProject = existing || createProject(file, await readPages(pdf))
    dispatch({ type: 'REPLACE_PROJECT', project: nextProject })
    setAssets(restoredAssets)
    setPdfDocument(pdf)
    setRecovery(null)
    setLockedFile(null)
    setUnlockPassword('')
    setIsLoading(false)
  }

  const openFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Choose a PDF file.')
      return
    }
    setIsLoading(true)
    try {
      const metadata = await getPdfMetaData(file)
      if (metadata.isLocked) {
        setLockedFile(file)
        setIsLoading(false)
        return
      }
      await activate(file, await loadPdfDocument(file))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The PDF could not be opened.')
      setIsLoading(false)
    }
  }

  const unlock = async () => {
    if (!lockedFile || !unlockPassword) return
    setIsLoading(true)
    const result = await unlockPdf(lockedFile, unlockPassword)
    if (!result.success || !result.pdfDoc) {
      toast.error('That password did not unlock the PDF.')
      setIsLoading(false)
      return
    }
    let existing = recovery?.project
    if (existing && existing.pages.length === 0) existing = undefined
    await activate(lockedFile, result.pdfDoc, existing, recovery?.assets || [], unlockPassword)
  }

  const restoreDraft = async () => {
    if (!recovery) return
    const file = new File([recovery.sourceBytes], recovery.project.sourceName, { type: 'application/pdf', lastModified: recovery.project.sourceLastModified })
    setIsLoading(true)
    try {
      await activate(file, await loadPdfDocument(file), recovery.project, recovery.assets)
    } catch (error: any) {
      if (error?.name === 'PasswordException') {
        setLockedFile(file)
        setIsLoading(false)
      } else {
        toast.error('The saved source PDF could not be restored.')
        setIsLoading(false)
      }
    }
  }

  const discardDraft = async () => {
    await clearEditorProject()
    setRecovery(null)
    setRecoveryError('')
  }

  const startOver = async () => {
    if (project?.objects.length && !window.confirm('Discard this editable draft and start over?')) return
    await clearEditorProject().catch(() => {})
    sourceBytesRef.current = null
    passwordRef.current = ''
    setPdfDocument(null)
    setAssets([])
    setRecovery(null)
    setLockedFile(null)
    setIsLoading(false)
    dispatch({ type: 'CLEAR_PROJECT' })
  }

  const maxZ = project?.objects.reduce((max, object) => Math.max(max, object.zIndex), 0) || 0
  const addText = (allPages = false) => {
    if (!project) return
    const watermark = mode === 'watermark' || allPages
    const object: TextObject = {
      id: createId('text'), type: 'text', text: watermark ? 'CONFIDENTIAL' : 'Double-click to edit',
      x: watermark ? .2 : .18, y: watermark ? .42 : .18, width: .6, height: .12,
      rotation: watermark ? -35 : 0, opacity: watermark ? .28 : 1, zIndex: maxZ + 1,
      scope: watermark ? { kind: 'all' } : { kind: 'single', pageIndex: project.activePageIndex },
      fontFamily: 'helvetica', fontStyle: 'bold', fontSize: watermark ? 42 : 18,
      color: '#111827', alignment: 'center', lineHeight: 1.2,
    }
    dispatch({ type: 'ADD_OBJECT', object })
    setMobilePropertiesOpen(true)
  }

  const addAssetObject = (asset: EditorAsset, type: 'image' | 'signature') => {
    if (!project) return
    setAssets((current) => [...current, asset])
    const width = type === 'signature' ? .28 : .32
    const height = width / asset.width * asset.height * (project.pages[project.activePageIndex].width / project.pages[project.activePageIndex].height)
    const object: SignatureObject | EditorObject = {
      id: createId(type), type, assetId: asset.id, aspectRatio: asset.width / asset.height,
      x: .5 - width / 2, y: .5 - height / 2, width, height,
      rotation: 0, opacity: 1, zIndex: maxZ + 1,
      scope: { kind: 'single', pageIndex: project.activePageIndex },
    }
    dispatch({ type: 'ADD_OBJECT', object })
    setSignatureOpen(false)
    setMobilePropertiesOpen(true)
  }

  const addImage = async (file: File) => {
    try { addAssetObject(await normalizeImageAsset(file, file.name), 'image') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'The image could not be added.') }
  }

  const selected = project?.objects.find((object) => object.id === project.selectedObjectId) || null
  const visibleObjects = useMemo(() => project
    ? project.objects.filter((object) => appliesToPage(object, project.activePageIndex))
    : [], [project])

  const updateSelected = useCallback((changes: Partial<EditorObject>) => {
    if (project?.selectedObjectId) dispatch({ type: 'UPDATE_OBJECT', id: project.selectedObjectId, changes })
  }, [project?.selectedObjectId])

  const duplicateSelected = () => {
    if (!selected) return
    const object = { ...selected, id: createId(selected.type), x: Math.min(.95 - selected.width, selected.x + .03), y: Math.min(.95 - selected.height, selected.y + .03), zIndex: maxZ + 1 }
    dispatch({ type: 'DUPLICATE_OBJECT', id: selected.id, object })
  }

  const exportPdf = useCallback(async () => {
    if (!project || !sourceBytesRef.current) return
    setIsExporting(true)
    try {
      const name = sanitizeOutputName(project.outputName)
      const bytes = await exportEditorProject(sourceBytesRef.current, { ...project, outputName: name }, assets, passwordRef.current)
      await downloadFile(bytes, name, 'application/pdf')
      await addActivity({ name, tool: 'PDF Editor', size: bytes.byteLength })
      toast.success(`Exported ${name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The edited PDF could not be exported.')
    } finally { setIsExporting(false) }
  }, [project, assets])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!project) return
      const target = event.target as HTMLElement
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' })
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault(); dispatch({ type: 'REDO' })
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd' && selected && !editing) {
        event.preventDefault(); duplicateSelected()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); exportPdf()
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !editing) {
        event.preventDefault(); dispatch({ type: 'DELETE_OBJECT', id: selected.id })
      } else if (event.key === 'Escape') dispatch({ type: 'SELECT_OBJECT', id: null })
      else if (selected && !editing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const step = event.shiftKey ? .01 : .002
        const changes: Partial<EditorObject> = {}
        if (event.key === 'ArrowLeft') changes.x = Math.max(0, selected.x - step)
        if (event.key === 'ArrowRight') changes.x = Math.min(1 - selected.width, selected.x + step)
        if (event.key === 'ArrowUp') changes.y = Math.max(0, selected.y - step)
        if (event.key === 'ArrowDown') changes.y = Math.min(1 - selected.height, selected.y + step)
        dispatch({ type: 'UPDATE_OBJECT', id: selected.id, changes })
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [project, selected, exportPdf])

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center bg-canvas"><Loader2 className="animate-spin text-accent" size={28} /><span className="ml-3 text-sm font-semibold text-muted">Opening your workspace…</span></div>

  if (lockedFile) return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
      <div className="system-surface w-full p-7 text-center"><Lock className="mx-auto text-accent" size={30} /><h1 className="mt-4 text-xl font-semibold">Unlock this PDF</h1><p className="mt-2 text-sm text-muted">The password stays in memory and is never saved with the draft.</p><input type="password" value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') unlock() }} placeholder="PDF password" className="mt-5 h-12 w-full px-4 text-center" autoFocus /><button onClick={unlock} disabled={!unlockPassword} className="system-button-primary mt-3 w-full">Unlock and edit</button></div>
    </div>
  )

  if (!project || !pdfDocument) return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
      <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <button onClick={() => pdfInputRef.current?.click()} className="group flex min-h-[420px] flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface p-8 text-center hover:border-accent hover:bg-elevated">
          <span className="flex h-16 w-16 items-center justify-center rounded-panel border border-line bg-canvas text-accent group-hover:border-accent/30 group-hover:bg-[var(--accent-soft)]"><FilePenLine size={28} /></span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Edit a PDF on your device</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">Add text, images, and signatures without uploading the document or creating an account.</p>
          <span className="system-button-primary mt-7 inline-flex items-center gap-2"><Upload size={17} /> Choose PDF</span>
        </button>
        <aside className="space-y-4">
          {(recovery || recoveryError) && <div className="system-surface p-5"><p className="system-label">Recovered workspace</p>{recovery ? <><p className="mt-3 truncate text-sm font-semibold">{recovery.project.sourceName}</p><p className="mt-1 text-xs text-muted">Saved {new Date(recovery.project.updatedAt).toLocaleString()}</p><button onClick={restoreDraft} className="system-button-primary mt-5 w-full">Restore draft</button><button onClick={discardDraft} className="mt-2 w-full rounded-ui px-4 py-3 text-xs font-semibold text-muted hover:bg-hover hover:text-red-600">Discard draft</button></> : <><p className="mt-3 text-sm leading-6 text-muted">{recoveryError}</p><button onClick={discardDraft} className="mt-4 rounded-ui border border-line px-4 py-2 text-xs font-semibold">Clear incompatible draft</button></>}</div>}
          <div className="system-surface p-5"><p className="system-label">Private by design</p><ul className="mt-4 space-y-3 text-sm text-muted"><li>• Processing stays in this browser.</li><li>• Draft recovery uses local device storage.</li><li>• Exports are flattened, portable PDFs.</li></ul></div>
        </aside>
      </div>
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) openFile(file) }} />
    </div>
  )

  return (
    <div className="tool-workspace flex h-[calc(100vh-64px)] min-h-[640px] flex-col overflow-hidden bg-canvas">
      <header className="z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 md:px-4">
        <label className="mr-1 hidden min-w-0 items-center gap-2 sm:flex">
          <span className="system-label shrink-0">Save as</span>
          <input
            value={project.outputName}
            onChange={(event) => dispatch({ type: 'SET_OUTPUT_NAME', outputName: event.target.value })}
            onBlur={(event) => dispatch({ type: 'SET_OUTPUT_NAME', outputName: sanitizeOutputName(event.target.value) })}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
            title={`Editing ${project.sourceName}`}
            spellCheck={false}
            autoComplete="off"
            className="h-7 w-40 min-w-0 px-2 text-[11px] sm:w-48"
          />
        </label>
        <div aria-live="polite" className="flex items-center text-[10px] text-muted">
          {draftUnavailable ? <span className="text-amber-600">Recovery unavailable</span> : isSaving ? <span>Saving locally…</span> : <span>Draft saved locally</span>}
        </div>
        <div className="h-8 w-px bg-line" />
        <button onClick={() => addText(false)} title="Add text" aria-label="Add text" className="grid h-10 w-10 place-items-center rounded-ui text-muted hover:bg-hover hover:text-ink"><Type size={18} /></button>
        <button onClick={() => imageInputRef.current?.click()} title="Add image" aria-label="Add image" className="grid h-10 w-10 place-items-center rounded-ui text-muted hover:bg-hover hover:text-ink"><ImagePlus size={18} /></button>
        <button onClick={() => setSignatureOpen(true)} title="Add signature" aria-label="Add signature" className="grid h-10 w-10 place-items-center rounded-ui text-muted hover:bg-hover hover:text-ink"><PenLine size={18} /></button>
        <div className="h-7 w-px bg-line" />
        <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!history?.past.length} aria-label="Undo" className="rounded-ui p-2.5 text-muted hover:bg-hover hover:text-ink disabled:opacity-30"><Undo2 size={17} /></button>
        <button onClick={() => dispatch({ type: 'REDO' })} disabled={!history?.future.length} aria-label="Redo" className="rounded-ui p-2.5 text-muted hover:bg-hover hover:text-ink disabled:opacity-30"><Redo2 size={17} /></button>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setMobilePropertiesOpen((value) => !value)} disabled={!selected} className="flex min-h-10 items-center gap-2 rounded-ui border border-line px-3 text-xs font-semibold hover:bg-hover disabled:opacity-40 lg:hidden">Properties <ChevronDown size={14} className={mobilePropertiesOpen ? 'rotate-180' : ''} /></button>
          <button onClick={() => setZoom((value) => Math.max(50, value - 10))} aria-label="Zoom out" className="rounded-ui p-2 text-muted hover:bg-hover"><ZoomOut size={16} /></button><span className="w-11 text-center text-[10px] font-semibold text-muted">{zoom}%</span><button onClick={() => setZoom((value) => Math.min(200, value + 10))} aria-label="Zoom in" className="rounded-ui p-2 text-muted hover:bg-hover"><ZoomIn size={16} /></button>
          <div className="mx-1 h-7 w-px bg-line" />
          <button onClick={startOver} title="Discard this draft and start over" className="flex min-h-10 items-center gap-2 rounded-ui border border-line px-3 text-xs font-semibold text-muted hover:bg-hover hover:text-red-600"><RotateCcw size={15} /><span className="hidden sm:inline">Start over</span></button>
          <button onClick={exportPdf} disabled={isExporting} className="system-button-primary ml-1 flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}<span className="hidden sm:inline">Export PDF</span></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[132px_minmax(0,1fr)_290px] lg:grid-rows-[minmax(0,1fr)]">
        <aside className="flex min-h-0 shrink-0 flex-col border-b border-line bg-surface lg:border-b-0 lg:border-r"><PageStrip pdfDocument={pdfDocument} pages={project.pages} activePageIndex={project.activePageIndex} onSelect={(pageIndex) => dispatch({ type: 'SET_PAGE', pageIndex })} /></aside>
        <main className="min-h-0 overflow-auto bg-[color-mix(in_srgb,var(--bg-primary),#94a3b8_8%)]">
          <EditorCanvas pdfDocument={pdfDocument} page={project.pages[project.activePageIndex]} objects={visibleObjects} selectedId={project.selectedObjectId} assetUrls={assetUrls} zoom={zoom} onSelect={(id) => dispatch({ type: 'SELECT_OBJECT', id })} onCommitPlacement={(id, changes) => dispatch({ type: 'UPDATE_OBJECT', id, changes })} />
        </main>
        <aside className="hidden min-h-0 overflow-y-auto border-l border-line bg-surface lg:block"><EditorInspector project={project} selected={selected} onUpdate={updateSelected} onDelete={() => selected && dispatch({ type: 'DELETE_OBJECT', id: selected.id })} onDuplicate={duplicateSelected} onReorder={(direction) => selected && dispatch({ type: 'REORDER_OBJECT', id: selected.id, direction })} /></aside>
      </div>

      {mobilePropertiesOpen && selected && <div className="fixed inset-x-0 bottom-0 z-[500] max-h-[75vh] overflow-y-auto rounded-t-panel border border-line bg-elevated shadow-ambient lg:hidden"><div className="sticky top-0 flex items-center justify-between border-b border-line bg-elevated px-5 py-3"><p className="text-sm font-semibold">Object properties</p><button onClick={() => setMobilePropertiesOpen(false)} className="rounded-ui p-2 text-muted"><Minus size={18} /></button></div><EditorInspector project={project} selected={selected} onUpdate={updateSelected} onDelete={() => dispatch({ type: 'DELETE_OBJECT', id: selected.id })} onDuplicate={duplicateSelected} onReorder={(direction) => dispatch({ type: 'REORDER_OBJECT', id: selected.id, direction })} /></div>}
      {signatureOpen && <SignatureDialog onClose={() => setSignatureOpen(false)} onCreate={(asset) => addAssetObject(asset, 'signature')} />}
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) addImage(file); event.currentTarget.value = '' }} />
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" />
    </div>
  )
}
