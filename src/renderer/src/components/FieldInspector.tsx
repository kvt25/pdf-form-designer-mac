import { useEditorStore } from '../store/editorStore'
import { validateFieldName } from '../lib/validation'

export default function FieldInspector(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const selectedId = useEditorStore((state) => state.selectedId)
  const updateField = useEditorStore((state) => state.updateField)
  const removeField = useEditorStore((state) => state.removeField)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)

  if (doc.kind !== 'open') {
    return (
      <section className="sidebar-section">
        <h2>Inspector</h2>
        <p className="muted">No field selected.</p>
      </section>
    )
  }

  const field = doc.fields.find((item) => item.id === selectedId)
  if (!field) {
    return (
      <section className="sidebar-section">
        <h2>Inspector</h2>
        <p className="muted">Select a field to edit its name and size.</p>
      </section>
    )
  }

  const nameError = validateFieldName(field.name, doc.fields, field.id)

  return (
    <section className="sidebar-section">
      <h2>Inspector</h2>
      <label className="field">
        <span>Name</span>
        <input
          value={field.name}
          onChange={(event) => updateField(field.id, { name: event.target.value })}
        />
        {nameError ? <span className="error">{nameError}</span> : null}
      </label>
      <label className="field">
        <span>Font size</span>
        <input
          type="number"
          min={6}
          max={72}
          value={field.fontSize}
          onChange={(event) =>
            updateField(field.id, { fontSize: Math.max(6, Number(event.target.value) || 12) })
          }
        />
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={field.multiline}
          onChange={(event) => updateField(field.id, { multiline: event.target.checked })}
        />
        <span>Multiline</span>
      </label>
      <label className="field">
        <span>Default value</span>
        <input
          value={field.defaultValue}
          onChange={(event) => updateField(field.id, { defaultValue: event.target.value })}
        />
      </label>
      <p className="muted">
        Page {field.page + 1} · {Math.round(field.width)}×{Math.round(field.height)} pt
      </p>
      <div className="inspector-actions">
        <button type="button" title="Duplicate field (⌘D)" onClick={() => duplicateSelected()}>
          Duplicate field
        </button>
        <button type="button" className="danger" onClick={() => removeField(field.id)}>
          Delete field
        </button>
      </div>
      <p className="muted">⌘C copy · ⌘V paste · ⌥-drag to clone</p>
    </section>
  )
}
