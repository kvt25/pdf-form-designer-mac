import { create } from 'zustand'
import type { FormField } from '../../../shared/types'
import { nextFieldName } from '../lib/validation'

export type Tool = 'select' | 'text'

export type EditorDocument =
  | { kind: 'empty' }
  | {
      kind: 'open'
      path: string
      bytes: Uint8Array
      fields: FormField[]
      dirty: boolean
    }

type EditorState = {
  doc: EditorDocument
  selectedId: string | null
  tool: Tool
  zoom: number
  currentPage: number
  pageCount: number
  loadDocument: (path: string, bytes: Uint8Array, fields: FormField[]) => void
  markSaved: (path: string, bytes: Uint8Array) => void
  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setCurrentPage: (page: number) => void
  setPageCount: (count: number) => void
  selectField: (id: string | null) => void
  addField: (field: Omit<FormField, 'id' | 'name'> & { name?: string }) => string
  updateField: (id: string, patch: Partial<FormField>) => void
  removeField: (id: string) => void
  removeSelected: () => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom / ZOOM_STEP) * ZOOM_STEP))
}

export const useEditorStore = create<EditorState>((set, get) => ({
  doc: { kind: 'empty' },
  selectedId: null,
  tool: 'select',
  zoom: 1,
  currentPage: 0,
  pageCount: 0,

  loadDocument: (path, bytes, fields) => {
    set({
      doc: { kind: 'open', path, bytes, fields, dirty: false },
      selectedId: null,
      tool: 'select',
      currentPage: 0
    })
  },

  markSaved: (path, bytes) => {
    const { doc } = get()
    if (doc.kind !== 'open') {
      return
    }
    set({
      doc: { ...doc, path, bytes, dirty: false }
    })
  },

  setTool: (tool) => set({ tool }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setPageCount: (count) => set({ pageCount: count }),

  selectField: (id) => set({ selectedId: id, tool: 'select' }),

  addField: (partial) => {
    const { doc } = get()
    if (doc.kind !== 'open') {
      return ''
    }
    const name = partial.name ?? nextFieldName(doc.fields)
    const id = crypto.randomUUID()
    const field: FormField = {
      id,
      name,
      page: partial.page,
      x: partial.x,
      y: partial.y,
      width: partial.width,
      height: partial.height,
      fontSize: partial.fontSize,
      multiline: partial.multiline,
      defaultValue: partial.defaultValue
    }
    set({
      doc: { ...doc, fields: [...doc.fields, field], dirty: true },
      selectedId: id
    })
    return id
  },

  updateField: (id, patch) => {
    const { doc } = get()
    if (doc.kind !== 'open') {
      return
    }
    set({
      doc: {
        ...doc,
        fields: doc.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
        dirty: true
      }
    })
  },

  removeField: (id) => {
    const { doc, selectedId } = get()
    if (doc.kind !== 'open') {
      return
    }
    set({
      doc: { ...doc, fields: doc.fields.filter((field) => field.id !== id), dirty: true },
      selectedId: selectedId === id ? null : selectedId
    })
  },

  removeSelected: () => {
    const { selectedId } = get()
    if (selectedId) {
      get().removeField(selectedId)
    }
  }
}))
