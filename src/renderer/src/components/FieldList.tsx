import { useEditorStore } from '../store/editorStore'

export default function FieldList(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const selectedId = useEditorStore((state) => state.selectedId)
  const selectField = useEditorStore((state) => state.selectField)

  if (doc.kind !== 'open') {
    return (
      <section className="sidebar-section">
        <h2>Fields</h2>
        <p className="muted">Open a PDF to add fields.</p>
      </section>
    )
  }

  if (doc.fields.length === 0) {
    return (
      <section className="sidebar-section">
        <h2>Fields</h2>
        <p className="muted">Draw a rectangle on the page to add a text field.</p>
      </section>
    )
  }

  return (
    <section className="sidebar-section">
      <h2>Fields</h2>
      <ul className="field-list">
        {doc.fields.map((field) => (
          <li key={field.id}>
            <button
              type="button"
              className={field.id === selectedId ? 'active' : undefined}
              onClick={() => {
                selectField(field.id)
                document
                  .getElementById(`field-${field.id}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                useEditorStore.getState().setCurrentPage(field.page)
              }}
            >
              <span className="field-list-name">{field.name}</span>
              <span className="muted">p.{field.page + 1}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
