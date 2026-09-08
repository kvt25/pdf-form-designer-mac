import { useRef } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import type { FormField, OrphanWidget } from '../../../shared/types'
import { clampViewRect, pdfRectToView, viewRectToPdf, type ViewRect } from '../lib/coords'
import { useEditorStore } from '../store/editorStore'

type Props = {
  field: FormField | OrphanWidget
  viewport: PageViewport
  selected: boolean
  orphan?: boolean
}

type DragSession = {
  kind: 'move' | 'resize'
  fieldId: string
  start: ViewRect
  pointerX: number
  pointerY: number
}

export default function FieldBox({
  field,
  viewport,
  selected,
  orphan = false
}: Props): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  const selectField = useEditorStore((state) => state.selectField)
  const cloneField = useEditorStore((state) => state.cloneField)
  const drag = useRef<DragSession | null>(null)
  const view = pdfRectToView(viewport, field)

  const begin = (event: React.PointerEvent<HTMLElement>, kind: 'move' | 'resize'): void => {
    event.stopPropagation()
    event.preventDefault()
    if (orphan) {
      selectField(field.id)
      return
    }
    const fieldId = kind === 'move' && event.altKey ? cloneField(field.id, 0) || field.id : field.id
    selectField(fieldId)
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      kind,
      fieldId,
      start: view,
      pointerX: event.clientX,
      pointerY: event.clientY
    }
  }

  const move = (event: React.PointerEvent<HTMLElement>): void => {
    const session = drag.current
    if (!session) {
      return
    }
    const dx = event.clientX - session.pointerX
    const dy = event.clientY - session.pointerY
    const next: ViewRect =
      session.kind === 'move'
        ? {
            ...session.start,
            left: session.start.left + dx,
            top: session.start.top + dy
          }
        : {
            ...session.start,
            width: session.start.width + dx,
            height: session.start.height + dy
          }
    const clamped = clampViewRect(next, viewport.width, viewport.height)
    updateField(session.fieldId, viewRectToPdf(viewport, clamped))
  }

  const end = (event: React.PointerEvent<HTMLElement>): void => {
    if (!drag.current) {
      return
    }
    event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }

  return (
    <div
      id={`field-${field.id}`}
      className={[
        selected ? 'field-box selected' : 'field-box',
        orphan ? 'orphan' : undefined,
        !orphan && !('borderColor' in field && field.borderColor) ? 'no-border' : undefined,
        !orphan && !('backgroundColor' in field && field.backgroundColor) ? 'no-fill' : undefined
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: view.left,
        top: view.top,
        width: view.width,
        height: view.height,
        ...(!orphan && 'borderColor' in field && field.borderColor
          ? { borderColor: field.borderColor }
          : {}),
        ...(!orphan && 'backgroundColor' in field && field.backgroundColor
          ? { backgroundColor: `color-mix(in srgb, ${field.backgroundColor} 35%, transparent)` }
          : {})
      }}
      onPointerDown={(event) => begin(event, 'move')}
      onPointerMove={move}
      onPointerUp={end}
    >
      <span className="field-box-label">{orphan ? `${field.name} (extra)` : field.name}</span>
      {selected && !orphan ? (
        <button
          type="button"
          className="resize-handle"
          aria-label="Resize field"
          onPointerDown={(event) => begin(event, 'resize')}
          onPointerMove={move}
          onPointerUp={end}
        />
      ) : null}
    </div>
  )
}
