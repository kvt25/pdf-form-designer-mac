import { useRef, useState } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import { DEFAULT_FIELD_BACKGROUND_COLOR, DEFAULT_FIELD_BORDER_COLOR } from '../../../shared/color'
import type { FormField, OrphanWidget } from '../../../shared/types'
import { clampViewRect, viewRectToPdf, type ViewRect } from '../lib/coords'
import { useEditorStore } from '../store/editorStore'
import FieldBox from './FieldBox'

type Props = {
  pageIndex: number
  viewport: PageViewport
  fields: FormField[]
  orphans: OrphanWidget[]
}

export default function FieldOverlay({
  pageIndex,
  viewport,
  fields,
  orphans
}: Props): React.JSX.Element {
  const tool = useEditorStore((state) => state.tool)
  const selectedId = useEditorStore((state) => state.selectedId)
  const selectField = useEditorStore((state) => state.selectField)
  const addField = useEditorStore((state) => state.addField)
  const overlayRef = useRef<HTMLDivElement>(null)
  const draw = useRef<{ startX: number; startY: number } | null>(null)
  const [draft, setDraft] = useState<ViewRect | null>(null)

  const localPoint = (event: React.PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const bounds = overlayRef.current?.getBoundingClientRect()
    if (!bounds) {
      return { x: 0, y: 0 }
    }
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.target !== overlayRef.current) {
      return
    }
    if (tool !== 'text') {
      selectField(null)
      return
    }
    const point = localPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    draw.current = { startX: point.x, startY: point.y }
    setDraft({ left: point.x, top: point.y, width: 0, height: 0 })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!draw.current) {
      return
    }
    const point = localPoint(event)
    const left = Math.min(draw.current.startX, point.x)
    const top = Math.min(draw.current.startY, point.y)
    setDraft({
      left,
      top,
      width: Math.abs(point.x - draw.current.startX),
      height: Math.abs(point.y - draw.current.startY)
    })
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!draw.current || !draft) {
      draw.current = null
      setDraft(null)
      return
    }
    overlayRef.current?.releasePointerCapture(event.pointerId)
    draw.current = null
    const clamped = clampViewRect(draft, viewport.width, viewport.height)
    setDraft(null)
    if (clamped.width < 24 || clamped.height < 14) {
      return
    }
    const pdf = viewRectToPdf(viewport, clamped)
    addField({
      page: pageIndex,
      x: pdf.x,
      y: pdf.y,
      width: pdf.width,
      height: pdf.height,
      fontSize: 12,
      multiline: clamped.height > 28,
      defaultValue: '',
      borderColor: DEFAULT_FIELD_BORDER_COLOR,
      backgroundColor: DEFAULT_FIELD_BACKGROUND_COLOR
    })
  }

  return (
    <div
      ref={overlayRef}
      className={tool === 'text' ? 'field-overlay drawing' : 'field-overlay'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {fields.map((field) => (
        <FieldBox
          key={field.id}
          field={field}
          viewport={viewport}
          selected={field.id === selectedId}
        />
      ))}
      {orphans.map((orphan) => (
        <FieldBox
          key={orphan.id}
          field={orphan}
          viewport={viewport}
          selected={orphan.id === selectedId}
          orphan
        />
      ))}
      {draft ? (
        <div
          className="field-draft"
          style={{
            left: draft.left,
            top: draft.top,
            width: draft.width,
            height: draft.height
          }}
        />
      ) : null}
    </div>
  )
}
