import { useEffect } from 'react'
import Toolbar from './components/Toolbar'
import ToolRail from './components/ToolRail'
import PdfViewer from './components/PdfViewer'
import FieldList from './components/FieldList'
import FieldInspector from './components/FieldInspector'
import { useEditorStore } from './store/editorStore'
import { TOOL_KEYS } from './lib/tools'
import {
  handleCloseRequested,
  openDocument,
  saveDocument,
  saveDocumentAs
} from './lib/documentActions'

export default function App(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const selectedId = useEditorStore((state) => state.selectedId)
  const removeSelected = useEditorStore((state) => state.removeSelected)
  const selectField = useEditorStore((state) => state.selectField)
  const copySelected = useEditorStore((state) => state.copySelected)
  const pasteClipboard = useEditorStore((state) => state.pasteClipboard)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)
  const nudgeSelected = useEditorStore((state) => state.nudgeSelected)

  useEffect(() => {
    const dirty = doc.kind === 'open' && doc.dirty
    window.api.setDirty(dirty)
    if (doc.kind !== 'open') {
      window.api.setTitle('PDF Form Designer')
      return
    }
    const name = doc.path.split(/[/\\]/).pop() ?? 'Untitled.pdf'
    window.api.setTitle(`${dirty ? '• ' : ''}${name} — PDF Form Designer`)
  }, [doc])

  useEffect(() => {
    const stopOpen = window.api.onMenuOpen(() => void openDocument())
    const stopSave = window.api.onMenuSave(() => void saveDocument())
    const stopSaveAs = window.api.onMenuSaveAs(() => void saveDocumentAs())
    const stopDuplicate = window.api.onMenuDuplicate(() => duplicateSelected())
    const stopClose = window.api.onCloseRequested(() => void handleCloseRequested())
    return () => {
      stopOpen()
      stopSave()
      stopSaveAs()
      stopDuplicate()
      stopClose()
    }
  }, [duplicateSelected])

  useEffect(() => {
    let pasteHandled = false
    const resetPasteHandled = (): void => {
      pasteHandled = false
    }

    const onKey = (event: KeyboardEvent): void => {
      if (isTextEditingTarget(event.target)) {
        return
      }
      if (event.key === 'Escape') {
        selectField(null)
        return
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId) {
        event.preventDefault()
        removeSelected()
        return
      }
      if (nudgeFromArrowKey(event, selectedId, nudgeSelected)) {
        return
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat) {
        const toolForKey = TOOL_KEYS[event.key.toLowerCase()]
        if (toolForKey && useEditorStore.getState().doc.kind === 'open') {
          event.preventDefault()
          const { tool, setTool } = useEditorStore.getState()
          setTool(tool === toolForKey ? 'select' : toolForKey)
          return
        }
      }
      const shortcut = event.metaKey || event.ctrlKey
      if (!shortcut || event.altKey || event.repeat) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'c') {
        event.preventDefault()
        copySelected()
        return
      }
      if (key === 'v') {
        event.preventDefault()
        pasteHandled = true
        pasteClipboard()
        queueMicrotask(resetPasteHandled)
      }
    }
    const onCopy = (event: ClipboardEvent): void => {
      if (isTextEditingTarget(event.target)) {
        return
      }
      const { doc, selectedId: id } = useEditorStore.getState()
      if (doc.kind !== 'open' || !id) {
        return
      }
      const field = doc.fields.find((item) => item.id === id)
      if (!field) {
        return
      }
      event.preventDefault()
      copySelected()
      event.clipboardData?.setData('text/plain', field.name)
    }
    const onPaste = (event: ClipboardEvent): void => {
      if (isTextEditingTarget(event.target) || pasteHandled) {
        return
      }
      if (!useEditorStore.getState().clipboard) {
        return
      }
      event.preventDefault()
      pasteClipboard()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
    }
  }, [copySelected, nudgeSelected, pasteClipboard, removeSelected, selectField, selectedId])

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <ToolRail />
        <PdfViewer />
        <aside className="sidebar">
          <FieldList />
          <FieldInspector />
        </aside>
      </div>
    </div>
  )
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

const NUDGE_STEP = 1
const NUDGE_STEP_LARGE = 10

function nudgeFromArrowKey(
  event: KeyboardEvent,
  selectedId: string | null,
  nudgeSelected: (dx: number, dy: number) => void
): boolean {
  if (!selectedId || event.metaKey || event.ctrlKey || event.altKey) {
    return false
  }
  const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
  let dx = 0
  let dy = 0
  if (event.key === 'ArrowLeft') {
    dx = -step
  } else if (event.key === 'ArrowRight') {
    dx = step
  } else if (event.key === 'ArrowUp') {
    dy = step
  } else if (event.key === 'ArrowDown') {
    dy = -step
  } else {
    return false
  }
  event.preventDefault()
  nudgeSelected(dx, dy)
  return true
}
