import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EditorInspector from './EditorInspector'
import { EDITOR_SCHEMA_VERSION, EditorProjectV1, TextObject } from '../../utils/editor/types'

const selected: TextObject = {
  id: 'text-1', type: 'text', text: 'Original', x: .1, y: .1, width: .4, height: .1,
  rotation: 0, opacity: 1, zIndex: 1, scope: { kind: 'single', pageIndex: 0 },
  fontFamily: 'helvetica', fontStyle: 'regular', fontSize: 16, color: '#111827', alignment: 'left', lineHeight: 1.2,
}

const project: EditorProjectV1 = {
  schemaVersion: EDITOR_SCHEMA_VERSION, id: 'active', sourceName: 'sample.pdf', sourceSize: 1,
  sourceLastModified: 1, outputName: 'sample-edited.pdf', pages: [{ index: 0, width: 612, height: 792, rotation: 0 }],
  objects: [selected], selectedObjectId: selected.id, activePageIndex: 0, createdAt: 1, updatedAt: 1,
}

describe('EditorInspector', () => {
  it('edits text and toggles all-page scope', () => {
    const onUpdate = vi.fn()
    render(<EditorInspector project={project} selected={selected} onUpdate={onUpdate} onDelete={vi.fn()} onDuplicate={vi.fn()} onReorder={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Updated copy' } })
    expect(onUpdate).toHaveBeenCalledWith({ text: 'Updated copy' })
    fireEvent.click(screen.getByLabelText('Apply to all pages'))
    expect(onUpdate).toHaveBeenCalledWith({ scope: { kind: 'all' } })
  })
})

