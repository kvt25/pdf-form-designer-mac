import { FIELD_KINDS, fieldKindLabel } from '../../../shared/widgetType'
import { useEditorStore } from '../store/editorStore'
import { openDocument, saveDocument, saveDocumentAs } from '../lib/documentActions'

export default function Toolbar(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const tool = useEditorStore((state) => state.tool)
  const zoom = useEditorStore((state) => state.zoom)
  const currentPage = useEditorStore((state) => state.currentPage)
  const pageCount = useEditorStore((state) => state.pageCount)
  const setTool = useEditorStore((state) => state.setTool)
  const setZoom = useEditorStore((state) => state.setZoom)

  const open = doc.kind === 'open'
  const fileLabel = open ? basename(doc.path) : 'No PDF open'

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={() => void openDocument()}>
          Open
        </button>
        <button type="button" onClick={() => void saveDocument()} disabled={!open}>
          Save
        </button>
        <button type="button" onClick={() => void saveDocumentAs()} disabled={!open}>
          Save As
        </button>
      </div>
      <div className="toolbar-group">
        {FIELD_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={tool === kind ? 'active' : undefined}
            disabled={!open}
            title={`Add ${fieldKindLabel(kind).toLowerCase()} field`}
            onClick={() => setTool(tool === kind ? 'select' : kind)}
          >
            {tool === kind ? `Drawing ${fieldKindLabel(kind)}…` : `Add ${fieldKindLabel(kind)}`}
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        <button type="button" disabled={!open} onClick={() => setZoom(zoom - 0.1)}>
          -
        </button>
        <span className="toolbar-label">{Math.round(zoom * 100)}%</span>
        <button type="button" disabled={!open} onClick={() => setZoom(zoom + 0.1)}>
          +
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          disabled={!open || currentPage <= 0}
          onClick={() => scrollToPage(currentPage - 1)}
        >
          Prev
        </button>
        <span className="toolbar-label">
          {open ? `Page ${currentPage + 1} of ${Math.max(pageCount, 1)}` : 'Page —'}
        </span>
        <button
          type="button"
          disabled={!open || currentPage + 1 >= pageCount}
          onClick={() => scrollToPage(currentPage + 1)}
        >
          Next
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
