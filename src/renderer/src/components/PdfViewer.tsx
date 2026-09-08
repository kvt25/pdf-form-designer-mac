import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdf } from '../lib/pdfjs'
import { useEditorStore } from '../store/editorStore'
import { openDocument } from '../lib/documentActions'
import PageCanvas from './PageCanvas'

export default function PdfViewer(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const zoom = useEditorStore((state) => state.zoom)
  const setPageCount = useEditorStore((state) => state.setPageCount)
  const setCurrentPage = useEditorStore((state) => state.setCurrentPage)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const bytes = doc.kind === 'open' ? doc.bytes : null

  useEffect(() => {
    if (!bytes) {
      return
    }
    let cancelled = false
    const task = loadPdf(bytes)
    void task.promise.then((next) => {
      if (cancelled) {
        return
      }
      setPdf(next)
      setPageCount(next.numPages)
    })
    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [bytes, setPageCount])

  if (doc.kind !== 'open') {
    return (
      <div className="empty-state">
        <h1>PDF Form Designer</h1>
        <p>
          Open a PDF, draw text fields on the page, and save. Java can fill those fields by name.
        </p>
        <button type="button" onClick={() => void openDocument()}>
          Open PDF
        </button>
      </div>
    )
  }

  if (!pdf) {
    return <div className="empty-state">Loading PDF…</div>
  }

  const pages = Array.from({ length: pdf.numPages }, (_, index) => index + 1)

  return (
    <div
      className="page-scroller"
      onScroll={(event) => {
        const scroller = event.currentTarget
        const sections = [...scroller.querySelectorAll<HTMLElement>('.page-wrap')]
        const mid = scroller.scrollTop + scroller.clientHeight / 3
        for (const section of sections) {
          if (section.offsetTop + section.offsetHeight >= mid) {
            const page = Number(section.id.replace('page-', ''))
            if (Number.isFinite(page)) {
              setCurrentPage(page)
            }
            break
          }
        }
      }}
    >
      {pages.map((pageNumber) => (
        <PageCanvas
          key={`${doc.path}-${pageNumber}`}
          pdf={pdf}
          pageNumber={pageNumber}
          zoom={zoom}
          fields={doc.fields.filter((field) => field.page === pageNumber - 1)}
          orphans={doc.orphans.filter((orphan) => orphan.page === pageNumber - 1)}
        />
      ))}
    </div>
  )
}
