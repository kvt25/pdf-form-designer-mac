export const PDFJS_PROTOCOL_SCHEME = 'pdfjs'
export const PDFJS_PROTOCOL_HOST = 'dist'

export const PDFJS_ASSET_BASE = `${PDFJS_PROTOCOL_SCHEME}://${PDFJS_PROTOCOL_HOST}/`

export const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'] as const

export type PdfjsAssetDir = (typeof PDFJS_ASSET_DIRS)[number]

export function pdfjsAssetUrl(dir: PdfjsAssetDir): string {
  return `${PDFJS_ASSET_BASE}${dir}/`
}
