import './pdfjsPolyfill'
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask } from 'pdfjs-dist'
import workerSrc from './pdf.worker?worker&url'
import { pdfjsAssetUrl } from '../../../shared/pdfjsAssets'

GlobalWorkerOptions.workerSrc = workerSrc

class ElectronPdfjsBinaryDataFactory {
  cMapUrl: string | null
  standardFontDataUrl: string | null
  wasmUrl: string | null

  constructor({
    cMapUrl = null,
    standardFontDataUrl = null,
    wasmUrl = null
  }: {
    cMapUrl?: string | null
    standardFontDataUrl?: string | null
    wasmUrl?: string | null
  }) {
    this.cMapUrl = cMapUrl
    this.standardFontDataUrl = standardFontDataUrl
    this.wasmUrl = wasmUrl
  }

  async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
    const baseUrl =
      kind === 'cMapUrl'
        ? this.cMapUrl
        : kind === 'standardFontDataUrl'
          ? this.standardFontDataUrl
          : kind === 'wasmUrl'
            ? this.wasmUrl
            : null
    if (!baseUrl) {
      throw new Error(`Ensure that the \`${kind}\` API parameter is provided.`)
    }
    const url = `${baseUrl}${filename}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Unable to load ${kind} data at: ${url}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }
}

export function loadPdf(bytes: Uint8Array): PDFDocumentLoadingTask {
  return getDocument({
    data: bytes.slice(),
    cMapUrl: pdfjsAssetUrl('cmaps'),
    cMapPacked: true,
    standardFontDataUrl: pdfjsAssetUrl('standard_fonts'),
    wasmUrl: pdfjsAssetUrl('wasm'),
    iccUrl: pdfjsAssetUrl('iccs'),
    useWorkerFetch: false,
    enableXfa: true,
    BinaryDataFactory: ElectronPdfjsBinaryDataFactory
  })
}
