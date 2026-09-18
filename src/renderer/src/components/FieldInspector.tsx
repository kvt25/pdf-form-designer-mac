import { DEFAULT_FIELD_BACKGROUND_COLOR, DEFAULT_FIELD_BORDER_COLOR } from '../../../shared/color'
import { fieldKindLabel, orphanControlLabel } from '../../../shared/widgetType'
import { validateFieldName } from '../lib/validation'
import { useEditorStore } from '../store/editorStore'
import type { FormField } from '../../../shared/types'

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
          {orphanControlLabel(orphan.fieldType, orphan.flags)} · page {orphan.page + 1}
        </p>
        <p className="muted">
          {orphan.kind === 'acro'
            ? 'This is a registered form control that this editor cannot design, such as a signature field. Saving without it removes it from the PDF.'
            : 'This annotation is on the page but is not registered in the AcroForm field tree. Saving without it removes it from the PDF.'}
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
  const radioGroup =
    field.kind === 'radio'
      ? doc.fields.filter((item) => item.kind === 'radio' && item.name === field.name)
      : []

  return (
    <section className="sidebar-section">
      <h2>{fieldKindLabel(field.kind)}</h2>
      <label className="field">
        <span>Name</span>
        <input
          value={field.name}
          onChange={(event) => updateField(field.id, { name: event.target.value })}
        />
        {nameError ? <span className="error">{nameError}</span> : null}
        {field.kind === 'radio' ? (
          <span className="muted">
            Group name — {radioGroup.length} option{radioGroup.length === 1 ? '' : 's'} share it.
            Duplicate this field to add an option.
          </span>
        ) : null}
      </label>

      {field.kind === 'text' ? <TextSection field={field} /> : null}
      {field.kind === 'checkbox' ? <CheckboxSection field={field} /> : null}
      {field.kind === 'radio' ? <RadioSection field={field} /> : null}
      {field.kind === 'dropdown' || field.kind === 'list' ? <ChoiceSection field={field} /> : null}
      {field.kind === 'button' ? <ButtonSection field={field} /> : null}

      {field.kind !== 'button' ? (
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => updateField(field.id, { required: event.target.checked })}
          />
          <span>Required</span>
        </label>
      ) : null}
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={field.readonly}
          onChange={(event) => updateField(field.id, { readonly: event.target.checked })}
        />
        <span>Read-only</span>
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
      <p className="muted">
        Double-click to rename · ⌘C copy · ⌘V paste · ⌥-drag to clone · arrows nudge (⇧ for 10pt)
      </p>
    </section>
  )
}

function TextSection({ field }: { field: FormField }): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  return (
    <>
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
        <span>Max length (blank for none)</span>
        <input
          type="number"
          min={1}
          value={field.maxLength ?? ''}
          onChange={(event) => {
            const raw = event.target.value
            updateField(field.id, {
              maxLength: raw === '' ? null : Math.max(1, Math.floor(Number(raw) || 1))
            })
          }}
        />
      </label>
      <label className="field">
        <span>Default value</span>
        <input
          value={field.defaultValue}
          onChange={(event) => updateField(field.id, { defaultValue: event.target.value })}
        />
      </label>
    </>
  )
}

function CheckboxSection({ field }: { field: FormField }): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  return (
    <>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={field.checked}
          onChange={(event) => updateField(field.id, { checked: event.target.checked })}
        />
        <span>Checked by default</span>
      </label>
      <p className="muted">Exports the value “Yes” when checked.</p>
    </>
  )
}

function RadioSection({ field }: { field: FormField }): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  const setSelected = (checked: boolean): void => {
    const state = useEditorStore.getState()
    const current = state.doc
    if (current.kind !== 'open') {
      return
    }
    if (checked) {
      for (const sibling of current.fields) {
        if (
          sibling.kind === 'radio' &&
          sibling.name === field.name &&
          sibling.id !== field.id &&
          sibling.checked
        ) {
          state.updateField(sibling.id, { checked: false })
        }
      }
    }
    state.updateField(field.id, { checked })
  }
  return (
    <>
      <label className="field">
        <span>Option value</span>
        <input
          value={field.exportValue}
          onChange={(event) => updateField(field.id, { exportValue: event.target.value })}
        />
        <span className="muted">The value your program sees when this option is picked.</span>
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={field.checked}
          onChange={(event) => setSelected(event.target.checked)}
        />
        <span>Selected by default</span>
      </label>
    </>
  )
}

function ChoiceSection({ field }: { field: FormField }): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  return (
    <>
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
      <label className="field">
        <span>Options (one per line)</span>
        <textarea
          rows={Math.min(8, Math.max(2, field.options.length + 1))}
          value={field.options.join('\n')}
          onChange={(event) =>
            updateField(field.id, {
              options: event.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line !== '')
            })
          }
        />
      </label>
      <label className="field">
        <span>Selected by default (blank for none)</span>
        <input
          value={field.defaultValue}
          list={`choice-options-${field.id}`}
          onChange={(event) => updateField(field.id, { defaultValue: event.target.value })}
        />
        <datalist id={`choice-options-${field.id}`}>
          {field.options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>
    </>
  )
}

function ButtonSection({ field }: { field: FormField }): React.JSX.Element {
  const updateField = useEditorStore((state) => state.updateField)
  return (
    <>
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
      <label className="field">
        <span>Label</span>
        <input
          value={field.defaultValue}
          placeholder={field.name}
          onChange={(event) => updateField(field.id, { defaultValue: event.target.value })}
        />
      </label>
    </>
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
