import { useEffect, useRef, useState } from 'react'
import {
  AnnotationMode,
  type PageViewport,
  type PDFDocumentProxy,
  type RenderTask
} from 'pdfjs-dist'
import type { FormField } from '../../../shared/types'
import FieldOverlay from './FieldOverlay'

type Props = {
  pdf: PDFDocumentProxy
  pageNumber: number
  zoom: number
  fields: FormField[]
}

export default function PageCanvas({ pdf, pageNumber, zoom, fields }: Props): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)

  useEffect(() => {
    let cancelled = false
    let renderTask: RenderTask | undefined

    const render = async (): Promise<void> => {
      const page = await pdf.getPage(pageNumber)
      if (cancelled) {
        return
      }
      const overlayViewport = page.getViewport({ scale: zoom })
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }
      const dpr = window.devicePixelRatio || 1
      const output = page.getViewport({ scale: zoom * dpr })
      canvas.width = output.width
      canvas.height = output.height
      canvas.style.width = `${overlayViewport.width}px`
      canvas.style.height = `${overlayViewport.height}px`
      const context = canvas.getContext('2d')
      if (!context) {
        return
      }
      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport: output,
        annotationMode: AnnotationMode.ENABLE_FORMS
      })
      try {
        await renderTask.promise
      } catch {
        return
      }
      if (!cancelled) {
        setViewport(overlayViewport)
      }
    }

    void render()
    return () => {
      cancelled = true
      void renderTask?.cancel()
    }
  }, [pdf, pageNumber, zoom])

  return (
    <section id={`page-${pageNumber - 1}`} className="page-wrap">
      <canvas ref={canvasRef} className="page-canvas" />
      {viewport ? (
        <FieldOverlay pageIndex={pageNumber - 1} viewport={viewport} fields={fields} />
      ) : null}
    </section>
  )
}
