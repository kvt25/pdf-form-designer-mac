import { useRef } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import type { FormField } from '../../../shared/types'
import { clampViewRect, pdfRectToView, viewRectToPdf, type ViewRect } from '../lib/coords'
import { useEditorStore } from '../store/editorStore'

type Props = {
  field: FormField
  viewport: PageViewport
  selected: boolean
}

type DragSession = {
  kind: 'move' | 'resize'
  start: ViewRect
  pointerX: number
  pointerY: number
}

export default function FieldBox({ field, viewport, selected }: Props): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  const selectField = useEditorStore((state) => state.selectField)
  const drag = useRef<DragSession | null>(null)
  const view = pdfRectToView(viewport, field)

  const begin = (event: React.PointerEvent<HTMLElement>, kind: 'move' | 'resize'): void => {
    event.stopPropagation()
    event.preventDefault()
    selectField(field.id)
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      kind,
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
    updateField(field.id, viewRectToPdf(viewport, clamped))
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
      className={selected ? 'field-box selected' : 'field-box'}
      style={{
        left: view.left,
        top: view.top,
        width: view.width,
        height: view.height
      }}
      onPointerDown={(event) => begin(event, 'move')}
      onPointerMove={move}
      onPointerUp={end}
    >
      <span className="field-box-label">{field.name}</span>
      {selected ? (
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
