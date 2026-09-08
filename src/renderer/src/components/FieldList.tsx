import { groupOrphansByControl } from '../../../shared/widgetType'
import { useEditorStore } from '../store/editorStore'

export default function FieldList(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const selectedId = useEditorStore((state) => state.selectedId)
  const selectField = useEditorStore((state) => state.selectField)
  const removeAllOrphans = useEditorStore((state) => state.removeAllOrphans)

  if (doc.kind !== 'open') {
    return (
      <section className="sidebar-section">
        <h2>Fields</h2>
        <p className="muted">Open a PDF to add fields.</p>
      </section>
    )
  }

  return (
    <>
      <section className="sidebar-section">
        <h2>Fields</h2>
        {doc.fields.length === 0 ? (
          <p className="muted">Draw a rectangle on the page to add a text field.</p>
        ) : (
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
        )}
      </section>
      {doc.orphans.length > 0 ? (
        <section className="sidebar-section">
          <h2>Extra widgets</h2>
          <p className="muted">
            On the page as leftover annotations, or as other AcroForm controls such as checkboxes
            and radio buttons. Remove them if you do not want viewers to keep them editable.
          </p>
          <ul className="field-list">
            {groupOrphansByControl(doc.orphans).map((group) => (
              <li key={group.label} className="extra-widget-group">
                <h3>{group.label}</h3>
                <ul className="field-list">
                  {group.items.map((orphan) => (
                    <li key={orphan.id}>
                      <button
                        type="button"
                        className={orphan.id === selectedId ? 'active orphan-item' : 'orphan-item'}
                        onClick={() => {
                          selectField(orphan.id)
                          document
                            .getElementById(`field-${orphan.id}`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          useEditorStore.getState().setCurrentPage(orphan.page)
                        }}
                      >
                        <span className="field-list-name">{orphan.name}</span>
                        <span className="muted">p.{orphan.page + 1}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="inspector-actions">
            <button type="button" className="danger" onClick={() => removeAllOrphans()}>
              Remove all extra widgets
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}
