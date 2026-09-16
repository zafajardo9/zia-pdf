import { EditorObject, EditorProjectV1 } from './types'

const HISTORY_LIMIT = 100

export interface EditorHistoryState {
  past: EditorProjectV1[]
  present: EditorProjectV1
  future: EditorProjectV1[]
}

export type EditorState = EditorHistoryState | null

export type EditorAction =
  | { type: 'ADD_OBJECT'; object: EditorObject }
  | { type: 'UPDATE_OBJECT'; id: string; changes: Partial<EditorObject> }
  | { type: 'DELETE_OBJECT'; id: string }
  | { type: 'DUPLICATE_OBJECT'; id: string; object: EditorObject }
  | { type: 'REORDER_OBJECT'; id: string; direction: 'forward' | 'backward' }
  | { type: 'SELECT_OBJECT'; id: string | null }
  | { type: 'SET_PAGE'; pageIndex: number }
  | { type: 'SET_OUTPUT_NAME'; outputName: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'REPLACE_PROJECT'; project: EditorProjectV1 }
  | { type: 'CLEAR_PROJECT' }

const withTimestamp = (project: EditorProjectV1): EditorProjectV1 => ({
  ...project,
  updatedAt: Date.now(),
})

const commit = (state: EditorHistoryState, next: EditorProjectV1): EditorHistoryState => ({
  past: [...state.past, state.present].slice(-HISTORY_LIMIT),
  present: withTimestamp(next),
  future: [],
})

export const createHistoryState = (project: EditorProjectV1): EditorHistoryState => ({
  past: [],
  present: project,
  future: [],
})

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  if (action.type === 'REPLACE_PROJECT') return createHistoryState(action.project)
  if (action.type === 'CLEAR_PROJECT') return null
  if (!state) return state
  const project = state.present
  switch (action.type) {
    case 'ADD_OBJECT':
      return commit(state, {
        ...project,
        objects: [...project.objects, action.object],
        selectedObjectId: action.object.id,
      })
    case 'UPDATE_OBJECT': {
      const objects = project.objects.map((object) =>
        object.id === action.id ? ({ ...object, ...action.changes } as EditorObject) : object,
      )
      return commit(state, { ...project, objects })
    }
    case 'DELETE_OBJECT':
      return commit(state, {
        ...project,
        objects: project.objects.filter((object) => object.id !== action.id),
        selectedObjectId: project.selectedObjectId === action.id ? null : project.selectedObjectId,
      })
    case 'DUPLICATE_OBJECT':
      return commit(state, {
        ...project,
        objects: [...project.objects, action.object],
        selectedObjectId: action.object.id,
      })
    case 'REORDER_OBJECT': {
      const ordered = [...project.objects].sort((a, b) => a.zIndex - b.zIndex)
      const index = ordered.findIndex((object) => object.id === action.id)
      const swapIndex = action.direction === 'forward' ? index + 1 : index - 1
      if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return state
      const currentZ = ordered[index].zIndex
      ordered[index] = { ...ordered[index], zIndex: ordered[swapIndex].zIndex }
      ordered[swapIndex] = { ...ordered[swapIndex], zIndex: currentZ }
      return commit(state, { ...project, objects: ordered })
    }
    case 'SELECT_OBJECT':
      return { ...state, present: { ...project, selectedObjectId: action.id } }
    case 'SET_PAGE':
      return { ...state, present: { ...project, activePageIndex: action.pageIndex, selectedObjectId: null } }
    case 'SET_OUTPUT_NAME':
      return { ...state, present: { ...project, outputName: action.outputName } }
    case 'UNDO': {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] }
    }
    case 'REDO': {
      const next = state.future[0]
      if (!next) return state
      return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: next, future: state.future.slice(1) }
    }
    default:
      return state
  }
}
