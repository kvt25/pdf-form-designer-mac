import type { PageViewport } from 'pdfjs-dist'

export type PdfRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ViewRect = {
  left: number
  top: number
  width: number
  height: number
}

function point(values: unknown): { x: number; y: number } {
  if (!Array.isArray(values) || typeof values[0] !== 'number' || typeof values[1] !== 'number') {
    throw new Error('Expected a coordinate pair')
  }
  return { x: values[0], y: values[1] }
}

export function pdfRectToView(viewport: PageViewport, rect: PdfRect): ViewRect {
  const bottomLeft = point(viewport.convertToViewportPoint(rect.x, rect.y))
  const topRight = point(viewport.convertToViewportPoint(rect.x + rect.width, rect.y + rect.height))
  return {
    left: bottomLeft.x,
    top: topRight.y,
    width: topRight.x - bottomLeft.x,
    height: bottomLeft.y - topRight.y
  }
}

export function viewRectToPdf(viewport: PageViewport, rect: ViewRect): PdfRect {
  const bottomLeft = point(viewport.convertToPdfPoint(rect.left, rect.top + rect.height))
  const topRight = point(viewport.convertToPdfPoint(rect.left + rect.width, rect.top))
  return {
    x: Math.min(bottomLeft.x, topRight.x),
    y: Math.min(bottomLeft.y, topRight.y),
    width: Math.abs(topRight.x - bottomLeft.x),
    height: Math.abs(topRight.y - bottomLeft.y)
  }
}

export function clampViewRect(rect: ViewRect, pageWidth: number, pageHeight: number): ViewRect {
  const width = Math.min(Math.max(rect.width, 24), pageWidth)
  const height = Math.min(Math.max(rect.height, 14), pageHeight)
  const left = Math.min(Math.max(rect.left, 0), pageWidth - width)
  const top = Math.min(Math.max(rect.top, 0), pageHeight - height)
  return { left, top, width, height }
}
