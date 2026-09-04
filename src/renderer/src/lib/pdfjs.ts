import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

export function loadPdf(bytes: Uint8Array): PDFDocumentLoadingTask {
  return getDocument({ data: bytes.slice() })
}
