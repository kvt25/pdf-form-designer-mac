import { X } from 'lucide-react'
import { useEditorStore } from '../store/editorStore'
import FieldInspector from './FieldInspector'

/**
 * Floating inspector card docked over the canvas, next to the sidebar.
 * It follows the selection: picking another field swaps the content, and
 * clearing the selection (X button, Escape, clicking empty canvas, deleting
 * the field) closes it.
 */
export default function InspectorPopup(): React.JSX.Element | null {
  const doc = useEditorStore((state) => state.doc)
  const selectedId = useEditorStore((state) => state.selectedId)
  const selectField = useEditorStore((state) => state.selectField)

  if (doc.kind !== 'open' || selectedId === null) {
    return null
  }
  const selected =
    doc.fields.some((field) => field.id === selectedId) ||
    doc.orphans.some((orphan) => orphan.id === selectedId)
  if (!selected) {
    return null
  }

  return (
    <div className="inspector-popup" role="dialog" aria-label="Field inspector">
      <button
        type="button"
        className="inspector-popup-close"
        title="Close inspector (Esc)"
        aria-label="Close inspector"
        onClick={() => selectField(null)}
      >
        <X size={15} strokeWidth={2} />
      </button>
      <div className="inspector-popup-body">
        <FieldInspector />
      </div>
    </div>
  )
}
