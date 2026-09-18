import { ChevronLeft, ChevronRight, FolderOpen, Save, ZoomIn, ZoomOut } from 'lucide-react'
import { useEditorStore } from '../store/editorStore'
import { openDocument, saveDocument, saveDocumentAs } from '../lib/documentActions'

export default function Toolbar(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const zoom = useEditorStore((state) => state.zoom)
  const currentPage = useEditorStore((state) => state.currentPage)
  const pageCount = useEditorStore((state) => state.pageCount)
  const setZoom = useEditorStore((state) => state.setZoom)

  const open = doc.kind === 'open'
  const fileLabel = open ? basename(doc.path) : 'No PDF open'

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button type="button" className="toolbar-button" onClick={() => void openDocument()}>
          <FolderOpen size={15} strokeWidth={1.8} />
          <span>Open</span>
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => void saveDocument()}
          disabled={!open}
        >
          <Save size={15} strokeWidth={1.8} />
          <span>Save</span>
        </button>
        <button
          type="button"
          className="toolbar-button ghost"
          onClick={() => void saveDocumentAs()}
          disabled={!open}
        >
          <span>Save As</span>
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-icon-button"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={!open}
          onClick={() => setZoom(zoom - 0.1)}
        >
          <ZoomOut size={15} strokeWidth={1.8} />
        </button>
        <span className="toolbar-label">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="toolbar-icon-button"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={!open}
          onClick={() => setZoom(zoom + 0.1)}
        >
          <ZoomIn size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-icon-button"
          title="Previous page"
          aria-label="Previous page"
          disabled={!open || currentPage <= 0}
          onClick={() => scrollToPage(currentPage - 1)}
        >
          <ChevronLeft size={15} strokeWidth={1.8} />
        </button>
        <span className="toolbar-label wide">
          {open ? `Page ${currentPage + 1} of ${Math.max(pageCount, 1)}` : 'Page —'}
        </span>
        <button
          type="button"
          className="toolbar-icon-button"
          title="Next page"
          aria-label="Next page"
          disabled={!open || currentPage + 1 >= pageCount}
          onClick={() => scrollToPage(currentPage + 1)}
        >
          <ChevronRight size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className="toolbar-file" title={open ? doc.path : undefined}>
        {open && doc.dirty ? '• ' : ''}
        {fileLabel}
      </div>
    </header>
  )
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] ?? path
}

function scrollToPage(page: number): void {
  document.getElementById(`page-${page}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  useEditorStore.getState().setCurrentPage(page)
}
