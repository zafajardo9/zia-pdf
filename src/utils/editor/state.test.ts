import { describe, expect, it } from 'vitest'
import { createHistoryState, editorReducer } from './state'
import { EDITOR_SCHEMA_VERSION, EditorProjectV1, TextObject } from './types'

const project = (): EditorProjectV1 => ({
  schemaVersion: EDITOR_SCHEMA_VERSION,
  id: 'active',
  sourceName: 'sample.pdf',
  sourceSize: 12,
  sourceLastModified: 1,
  outputName: 'sample-edited.pdf',
  pages: [{ index: 0, width: 612, height: 792, rotation: 0 }],
  objects: [],
  selectedObjectId: null,
  activePageIndex: 0,
  createdAt: 1,
  updatedAt: 1,
})

const textObject = (id = 'text-1'): TextObject => ({
  id,
  type: 'text',
  text: 'Hello',
  x: .1,
  y: .1,
  width: .4,
  height: .1,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  scope: { kind: 'single', pageIndex: 0 },
  fontFamily: 'helvetica',
  fontStyle: 'regular',
  fontSize: 16,
  color: '#111827',
  alignment: 'left',
  lineHeight: 1.2,
})

describe('editorReducer', () => {
  it('adds, updates, deletes, undoes, and redoes objects', () => {
    let state = createHistoryState(project())
    state = editorReducer(state, { type: 'ADD_OBJECT', object: textObject() })!
    expect(state.present.objects).toHaveLength(1)
    state = editorReducer(state, { type: 'UPDATE_OBJECT', id: 'text-1', changes: { text: 'Updated' } })!
    expect((state.present.objects[0] as TextObject).text).toBe('Updated')
    state = editorReducer(state, { type: 'DELETE_OBJECT', id: 'text-1' })!
    expect(state.present.objects).toHaveLength(0)
    state = editorReducer(state, { type: 'UNDO' })!
    expect(state.present.objects).toHaveLength(1)
    state = editorReducer(state, { type: 'REDO' })!
    expect(state.present.objects).toHaveLength(0)
  })

  it('caps committed history at 100 entries', () => {
    let state = createHistoryState(project())
    for (let index = 0; index < 110; index++) {
      state = editorReducer(state, { type: 'ADD_OBJECT', object: textObject(`text-${index}`) })!
    }
    expect(state.past).toHaveLength(100)
  })

  it('renames the output without touching undo history', () => {
    let state = createHistoryState(project())
    state = editorReducer(state, { type: 'ADD_OBJECT', object: textObject() })!
    state = editorReducer(state, { type: 'SET_OUTPUT_NAME', outputName: 'renamed.pdf' })!
    expect(state.present.outputName).toBe('renamed.pdf')
    expect(state.past).toHaveLength(1)
    expect(state.past[0].outputName).toBe('sample-edited.pdf')
  })

  it('swaps z-index when moving a layer', () => {
    let state = createHistoryState({ ...project(), objects: [textObject('a'), { ...textObject('b'), zIndex: 2 }] })
    state = editorReducer(state, { type: 'REORDER_OBJECT', id: 'a', direction: 'forward' })!
    expect(state.present.objects.find((object) => object.id === 'a')?.zIndex).toBe(2)
    expect(state.present.objects.find((object) => object.id === 'b')?.zIndex).toBe(1)
  })
})

