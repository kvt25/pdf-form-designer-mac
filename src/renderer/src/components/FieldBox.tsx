import { useLayoutEffect, useRef, useState } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import type { FormField, OrphanWidget } from '../../../shared/types'
import { orphanControlLabel } from '../../../shared/widgetType'
import { clampViewRect, pdfRectToView, viewRectToPdf, type ViewRect } from '../lib/coords'
import { validateFieldName } from '../lib/validation'
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

const DOUBLE_CLICK_MS = 400
const DOUBLE_CLICK_PX = 6

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
  const lastClick = useRef<{ time: number; x: number; y: number } | null>(null)
  const renamingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(field.name)
  const view = pdfRectToView(viewport, field)

  const startRename = (): void => {
    if (orphan || renamingRef.current) {
      return
    }
    renamingRef.current = true
    setDraftName(field.name)
    setRenaming(true)
  }

  const stopRename = (): void => {
    renamingRef.current = false
    setDraftName(field.name)
    setRenaming(false)
  }

  const commitRename = (): void => {
    if (!renamingRef.current) {
      return
    }
    const name = draftName.trim()
    const { doc } = useEditorStore.getState()
    const fields = doc.kind === 'open' ? doc.fields : []
    const error = validateFieldName(name, fields, field.id)
    if (error) {
      stopRename()
      return
    }
    if (name !== field.name) {
      updateField(field.id, { name })
    }
    renamingRef.current = false
    setRenaming(false)
  }

  const commitRenameFromEnter = (): void => {
    const name = draftName.trim()
    const { doc } = useEditorStore.getState()
    const fields = doc.kind === 'open' ? doc.fields : []
    const error = validateFieldName(name, fields, field.id)
    const input = inputRef.current
    if (error) {
      input?.setCustomValidity(error)
      input?.reportValidity()
      return
    }
    input?.setCustomValidity('')
    if (name !== field.name) {
      updateField(field.id, { name })
    }
    renamingRef.current = false
    setRenaming(false)
  }

  useLayoutEffect(() => {
    if (!renaming) {
      return
    }
    const input = inputRef.current
    if (!input) {
      return
    }
    input.focus()
    input.select()
  }, [renaming])

  const begin = (event: React.PointerEvent<HTMLElement>, kind: 'move' | 'resize'): void => {
    event.stopPropagation()
    event.preventDefault()
    if (orphan) {
      selectField(field.id)
      return
    }
    if (renamingRef.current) {
      return
    }
    if (kind === 'move' && isDoubleClick(event, lastClick.current)) {
      lastClick.current = null
      selectField(field.id)
      startRename()
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
    const session = drag.current
    if (!session) {
      return
    }
    event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    if (orphan || session.kind !== 'move') {
      lastClick.current = null
      return
    }
    const moved = Math.hypot(event.clientX - session.pointerX, event.clientY - session.pointerY)
    if (moved >= DOUBLE_CLICK_PX) {
      lastClick.current = null
      return
    }
    lastClick.current = { time: performance.now(), x: event.clientX, y: event.clientY }
  }

  return (
    <div
      id={`field-${field.id}`}
      className={[
        selected ? 'field-box selected' : 'field-box',
        orphan ? 'orphan' : undefined,
        renaming ? 'renaming' : undefined,
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
      onDoubleClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        if (!orphan) {
          selectField(field.id)
          startRename()
        }
      }}
    >
      {renaming ? (
        <input
          ref={inputRef}
          className="field-box-name-input"
          value={draftName}
          aria-label="Field name"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setDraftName(event.target.value)
            event.target.setCustomValidity('')
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commitRenameFromEnter()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              stopRename()
            }
          }}
          onBlur={commitRename}
        />
      ) : (
        <span className="field-box-label">
          {orphan && 'fieldType' in field
            ? `${field.name} · ${orphanControlLabel(field.fieldType, field.flags)}`
            : field.name}
        </span>
      )}
      {selected && !orphan && !renaming ? (
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

function isDoubleClick(
  event: React.PointerEvent<HTMLElement>,
  previous: { time: number; x: number; y: number } | null
): boolean {
  if (!previous) {
    return false
  }
  return (
    performance.now() - previous.time < DOUBLE_CLICK_MS &&
    Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < DOUBLE_CLICK_PX
  )
}
