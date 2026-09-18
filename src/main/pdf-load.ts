import { EncryptedPDFError, PDFDocument } from 'pdf-lib'
import { toPdfBytes } from '../shared/bytes'

export type PdfLoadOptions = {
  ignoreEncryption?: boolean
}

export function isEncryptedPdfError(error: unknown): boolean {
  return (
    error instanceof EncryptedPDFError ||
    (error instanceof Error &&
      error.message.includes('PDFDocument.load') &&
      error.message.includes('ignoreEncryption'))
  )
}

export function loadPdfDocument(
  source: Uint8Array,
  options: PdfLoadOptions = {}
): Promise<PDFDocument> {
  return PDFDocument.load(toPdfBytes(source), {
    ignoreEncryption: options.ignoreEncryption ?? false
  })
}

export async function loadPdfDocumentAllowingEncryption(source: Uint8Array): Promise<PDFDocument> {
  try {
    return await loadPdfDocument(source)
  } catch (error) {
    if (!isEncryptedPdfError(error)) {
      throw error
    }
    return loadPdfDocument(source, { ignoreEncryption: true })
  }
}
