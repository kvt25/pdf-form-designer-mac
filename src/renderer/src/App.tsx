import { useEffect } from 'react'
import Toolbar from './components/Toolbar'
import PdfViewer from './components/PdfViewer'
import FieldList from './components/FieldList'
import FieldInspector from './components/FieldInspector'
import { useEditorStore } from './store/editorStore'
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
    const stopClose = window.api.onCloseRequested(() => void handleCloseRequested())
    return () => {
      stopOpen()
      stopSave()
      stopSaveAs()
      stopClose()
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return
      }
      if (event.key === 'Escape') {
        selectField(null)
        return
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId) {
        event.preventDefault()
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removeSelected, selectField, selectedId])

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <PdfViewer />
        <aside className="sidebar">
          <FieldList />
          <FieldInspector />
        </aside>
      </div>
    </div>
  )
}
