export const EDITOR_SCHEMA_VERSION = 1 as const

export type EditorMode = 'default' | 'signature' | 'watermark'
export type EditorFontFamily = 'helvetica' | 'times' | 'courier'
export type EditorFontStyle = 'regular' | 'bold' | 'italic' | 'boldItalic'
export type TextAlignment = 'left' | 'center' | 'right'

export interface PagePlacement {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export type PageScope =
  | { kind: 'single'; pageIndex: number }
  | { kind: 'all' }

interface EditorObjectBase extends PagePlacement {
  id: string
  opacity: number
  zIndex: number
  scope: PageScope
}

export interface TextObject extends EditorObjectBase {
  type: 'text'
  text: string
  fontFamily: EditorFontFamily
  fontStyle: EditorFontStyle
  fontSize: number
  color: string
  alignment: TextAlignment
  lineHeight: number
}

export interface ImageObject extends EditorObjectBase {
  type: 'image'
  assetId: string
  aspectRatio: number
}

export interface SignatureObject extends EditorObjectBase {
  type: 'signature'
  assetId: string
  aspectRatio: number
}

export type EditorObject = TextObject | ImageObject | SignatureObject

export interface EditorAsset {
  id: string
  name: string
  mimeType: 'image/png' | 'image/jpeg'
  blob: Blob
  width: number
  height: number
}

export interface EditorPage {
  index: number
  width: number
  height: number
  rotation: number
}

export interface EditorProjectV1 {
  schemaVersion: typeof EDITOR_SCHEMA_VERSION
  id: 'active'
  sourceName: string
  sourceSize: number
  sourceLastModified: number
  outputName: string
  pages: EditorPage[]
  objects: EditorObject[]
  selectedObjectId: string | null
  activePageIndex: number
  createdAt: number
  updatedAt: number
}

export interface PersistedEditorProject {
  project: EditorProjectV1
  sourceBytes: ArrayBuffer
  assets: EditorAsset[]
}

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

export const appliesToPage = (object: EditorObject, pageIndex: number) =>
  object.scope.kind === 'all' || object.scope.pageIndex === pageIndex

