import { create } from 'zustand'
import { DEFAULT_FIELD_BACKGROUND_COLOR, DEFAULT_FIELD_BORDER_COLOR } from '../../../shared/color'
import type { FieldKind, FormField, OrphanWidget } from '../../../shared/types'
import {
  nextFieldName,
  nextRadioExportValue,
  uniqueFieldName,
  uniqueRadioExportValue
} from '../lib/validation'

export type Tool = 'select' | FieldKind

export type EditorDocument =
  | { kind: 'empty' }
  | {
      kind: 'open'
      path: string
      bytes: Uint8Array
      fields: FormField[]
      orphans: OrphanWidget[]
      dirty: boolean
    }

type FieldClipboard = Omit<FormField, 'id'>

type EditorState = {
  doc: EditorDocument
  selectedId: string | null
  tool: Tool
  zoom: number
  currentPage: number
  pageCount: number
  clipboard: FieldClipboard | null
  pasteCount: number
  loadDocument: (
    path: string,
    bytes: Uint8Array,
    fields: FormField[],
    orphans: OrphanWidget[]
  ) => void
  markSaved: (path: string, bytes: Uint8Array) => void
  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setCurrentPage: (page: number) => void
  setPageCount: (count: number) => void
  selectField: (id: string | null) => void
  addField: (
    field: Partial<Omit<FormField, 'id'>> & Pick<FormField, 'page' | 'x' | 'y' | 'width' | 'height'>
  ) => string
  updateField: (id: string, patch: Partial<FormField>) => void
  removeField: (id: string) => void
  removeOrphan: (id: string) => void
  removeAllOrphans: () => void
  removeSelected: () => void
  cloneField: (id: string, offsetSteps?: number) => string
  copySelected: () => void
  pasteClipboard: () => string
  duplicateSelected: () => string
  nudgeSelected: (dx: number, dy: number) => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1
const CLONE_OFFSET = 16

function snapshotField(field: FormField): FieldClipboard {
  return {
    name: field.name,
    kind: field.kind,
    page: field.page,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    fontSize: field.fontSize,
    multiline: field.multiline,
    defaultValue: field.defaultValue,
    required: field.required,
    readonly: field.readonly,
    maxLength: field.maxLength,
    options: [...field.options],
    exportValue: field.exportValue,
    checked: field.checked,
    borderColor: field.borderColor,
    backgroundColor: field.backgroundColor
  }
}

function offsetClone(field: FieldClipboard, offsetSteps: number, page: number): FieldClipboard {
  const delta = CLONE_OFFSET * offsetSteps
  return {
    ...field,
    page,
    x: field.x + delta,
    y: Math.max(0, field.y - delta)
  }
}

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
  clipboard: null,
  pasteCount: 0,

  loadDocument: (path, bytes, fields, orphans) => {
    set({
      doc: { kind: 'open', path, bytes, fields, orphans, dirty: false },
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
    const kind: FieldKind = partial.kind ?? 'text'
    const name = partial.name ?? nextFieldName(doc.fields, kind)
    const id = crypto.randomUUID()
    const field: FormField = {
      id,
      name,
      kind,
      page: partial.page,
      x: partial.x,
      y: partial.y,
      width: partial.width,
      height: partial.height,
      fontSize: partial.fontSize ?? 12,
      multiline: partial.multiline ?? false,
      defaultValue: partial.defaultValue ?? '',
      required: partial.required ?? false,
      readonly: partial.readonly ?? false,
      maxLength: partial.maxLength ?? null,
      options: partial.options ?? [],
      exportValue:
        partial.exportValue ?? (kind === 'radio' ? nextRadioExportValue(name, doc.fields) : 'Yes'),
      checked: partial.checked ?? false,
      borderColor:
        partial.borderColor !== undefined ? partial.borderColor : DEFAULT_FIELD_BORDER_COLOR,
      backgroundColor:
        partial.backgroundColor !== undefined
          ? partial.backgroundColor
          : DEFAULT_FIELD_BACKGROUND_COLOR
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
    const target = doc.fields.find((field) => field.id === id)
    // Radio options share one group name, so renaming one renames the group.
    const inGroupRename =
      target?.kind === 'radio' && patch.name !== undefined && patch.name !== target.name
    set({
      doc: {
        ...doc,
        fields: doc.fields.map((field) => {
          if (inGroupRename && field.kind === 'radio' && field.name === target.name) {
            return { ...field, ...patch }
          }
          return field.id === id ? { ...field, ...patch } : field
        }),
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

  removeOrphan: (id) => {
    const { doc, selectedId } = get()
    if (doc.kind !== 'open') {
      return
    }
    set({
      doc: { ...doc, orphans: doc.orphans.filter((orphan) => orphan.id !== id), dirty: true },
      selectedId: selectedId === id ? null : selectedId
    })
  },

  removeAllOrphans: () => {
    const { doc, selectedId } = get()
    if (doc.kind !== 'open' || doc.orphans.length === 0) {
      return
    }
    const selectedIsOrphan =
      selectedId !== null && doc.orphans.some((orphan) => orphan.id === selectedId)
    set({
      doc: { ...doc, orphans: [], dirty: true },
      selectedId: selectedIsOrphan ? null : selectedId
    })
  },

  removeSelected: () => {
    const { doc, selectedId } = get()
    if (!selectedId || doc.kind !== 'open') {
      return
    }
    if (doc.orphans.some((orphan) => orphan.id === selectedId)) {
      get().removeOrphan(selectedId)
      return
    }
    get().removeField(selectedId)
  },

  cloneField: (id, offsetSteps = 1) => {
    const { doc } = get()
    if (doc.kind !== 'open') {
      return ''
    }
    const source = doc.fields.find((field) => field.id === id)
    if (!source) {
      return ''
    }
    const clone = offsetClone(snapshotField(source), offsetSteps, source.page)
    if (source.kind === 'radio') {
      // Cloning a radio button adds an option to the same group.
      return get().addField({
        ...clone,
        exportValue: uniqueRadioExportValue(source.exportValue, source.name, doc.fields)
      })
    }
    return get().addField({
      ...clone,
      name: uniqueFieldName(source.name, doc.fields, source.kind)
    })
  },

  copySelected: () => {
    const { doc, selectedId } = get()
    if (doc.kind !== 'open' || !selectedId) {
      return
    }
    const source = doc.fields.find((field) => field.id === selectedId)
    if (!source) {
      return
    }
    set({ clipboard: snapshotField(source), pasteCount: 0 })
  },

  pasteClipboard: () => {
    const { doc, clipboard, currentPage, pasteCount } = get()
    if (doc.kind !== 'open' || !clipboard) {
      return ''
    }
    const samePage = clipboard.page === currentPage
    const steps = samePage ? pasteCount + 1 : 0
    const clone = offsetClone(clipboard, steps, currentPage)
    const id =
      clipboard.kind === 'radio'
        ? get().addField({
            ...clone,
            exportValue: uniqueRadioExportValue(clipboard.exportValue, clipboard.name, doc.fields)
          })
        : get().addField({
            ...clone,
            name: uniqueFieldName(clipboard.name, doc.fields, clipboard.kind)
          })
    if (samePage) {
      set({ pasteCount: steps })
    }
    return id
  },

  duplicateSelected: () => {
    const { selectedId } = get()
    if (!selectedId) {
      return ''
    }
    return get().cloneField(selectedId, 1)
  },

  nudgeSelected: (dx, dy) => {
    const { doc, selectedId } = get()
    if (doc.kind !== 'open' || !selectedId || (dx === 0 && dy === 0)) {
      return
    }
    const field = doc.fields.find((item) => item.id === selectedId)
    if (!field) {
      return
    }
    const x = Math.max(0, field.x + dx)
    const y = Math.max(0, field.y + dy)
    if (x === field.x && y === field.y) {
      return
    }
    get().updateField(selectedId, { x, y })
  }
}))
