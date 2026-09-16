import { beforeEach, describe, expect, it } from 'vitest'
import { clearEditorProject, loadEditorProject, saveEditorProject } from './persistence'
import { EDITOR_SCHEMA_VERSION, PersistedEditorProject } from './types'

const record = (): PersistedEditorProject => ({
  project: {
    schemaVersion: EDITOR_SCHEMA_VERSION,
    id: 'active',
    sourceName: 'draft.pdf',
    sourceSize: 3,
    sourceLastModified: 1,
    outputName: 'draft-edited.pdf',
    pages: [],
    objects: [],
    selectedObjectId: null,
    activePageIndex: 0,
    createdAt: 1,
    updatedAt: 2,
  },
  sourceBytes: new Uint8Array([1, 2, 3]).buffer,
  assets: [{ id: 'asset-1', name: 'image.png', mimeType: 'image/png', blob: new Blob(['x'], { type: 'image/png' }), width: 10, height: 5 }],
})

describe('editor persistence', () => {
  beforeEach(async () => clearEditorProject())

  it('round trips the source, project, and assets', async () => {
    await saveEditorProject(record())
    const restored = await loadEditorProject()
    expect(restored?.project.sourceName).toBe('draft.pdf')
    expect(Array.from(new Uint8Array(restored!.sourceBytes))).toEqual([1, 2, 3])
    expect(restored?.assets[0]).toMatchObject({ id: 'asset-1', name: 'image.png', width: 10, height: 5 })
  })

  it('clears the active draft', async () => {
    await saveEditorProject(record())
    await clearEditorProject()
    expect(await loadEditorProject()).toBeNull()
  })
})
