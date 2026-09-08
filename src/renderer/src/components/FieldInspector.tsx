import { DEFAULT_FIELD_BACKGROUND_COLOR, DEFAULT_FIELD_BORDER_COLOR } from '../../../shared/color'
import { validateFieldName } from '../lib/validation'
import { useEditorStore } from '../store/editorStore'

export default function FieldInspector(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const selectedId = useEditorStore((state) => state.selectedId)
  const updateField = useEditorStore((state) => state.updateField)
  const removeField = useEditorStore((state) => state.removeField)
  const removeOrphan = useEditorStore((state) => state.removeOrphan)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)

  if (doc.kind !== 'open') {
    return (
      <section className="sidebar-section">
        <h2>Inspector</h2>
        <p className="muted">No field selected.</p>
      </section>
    )
  }

  const orphan = doc.orphans.find((item) => item.id === selectedId)
  if (orphan) {
    return (
      <section className="sidebar-section">
        <h2>Extra widget</h2>
        <p>
          <strong>{orphan.name}</strong>
        </p>
        <p className="muted">
          {orphanTypeLabel(orphan.fieldType)} · page {orphan.page + 1} · flags {orphan.flags}
        </p>
        <p className="muted">
          This annotation is on the page but is not registered in the AcroForm field tree. Saving
          without it removes it from the PDF.
        </p>
        <div className="inspector-actions">
          <button type="button" className="danger" onClick={() => removeOrphan(orphan.id)}>
            Remove extra widget
          </button>
        </div>
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
      <ColorField
        label="Border color"
        value={field.borderColor}
        fallback={DEFAULT_FIELD_BORDER_COLOR}
        onChange={(borderColor) => updateField(field.id, { borderColor })}
      />
      <ColorField
        label="Fill color"
        value={field.backgroundColor}
        fallback={DEFAULT_FIELD_BACKGROUND_COLOR}
        onChange={(backgroundColor) => updateField(field.id, { backgroundColor })}
      />
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
      <p className="muted">⌘C copy · ⌘V paste · ⌥-drag to clone · arrows nudge (⇧ for 10pt)</p>
    </section>
  )
}

function ColorField({
  label,
  value,
  fallback,
  onChange
}: {
  label: string
  value: string | null
  fallback: string
  onChange: (value: string | null) => void
}): React.JSX.Element {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="color-row">
        <input
          type="color"
          aria-label={label}
          value={value ?? fallback}
          onChange={(event) => onChange(event.target.value)}
          onClick={() => {
            if (value === null) {
              onChange(fallback)
            }
          }}
        />
        <button
          type="button"
          className={value === null ? 'active' : undefined}
          onClick={() => onChange(null)}
        >
          None
        </button>
      </div>
    </div>
  )
}

function orphanTypeLabel(fieldType: string | null): string {
  if (fieldType === 'Tx') {
    return 'Text'
  }
  if (fieldType === 'Sig') {
    return 'Signature'
  }
  if (fieldType === 'Btn') {
    return 'Button'
  }
  if (fieldType === 'Ch') {
    return 'Choice'
  }
  return fieldType ?? 'Unknown type'
}
