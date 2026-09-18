import { MousePointer2 } from 'lucide-react'
import { FIELD_TOOLS, TOOL_SHORTCUTS, toolLabel } from '../lib/tools'
import { useEditorStore } from '../store/editorStore'

export default function ToolRail(): React.JSX.Element {
  const doc = useEditorStore((state) => state.doc)
  const tool = useEditorStore((state) => state.tool)
  const setTool = useEditorStore((state) => state.setTool)

  const open = doc.kind === 'open'

  const pick = (next: typeof tool): void => {
    setTool(tool === next ? 'select' : next)
  }

  return (
    <nav className="tool-rail" aria-label="Field tools">
      <div className="rail-section">
        <span className="rail-label">Select</span>
        <button
          type="button"
          className={tool === 'select' ? 'rail-button active' : 'rail-button'}
          disabled={!open}
          title={`Select / move fields (${TOOL_SHORTCUTS.select})`}
          onClick={() => pick('select')}
        >
          <MousePointer2 size={18} strokeWidth={1.8} />
          <span>Select</span>
        </button>
      </div>
      <div className="rail-section">
        <span className="rail-label">Fields</span>
        {FIELD_TOOLS.map(({ kind, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            className={tool === kind ? 'rail-button active' : 'rail-button'}
            disabled={!open}
            title={`Add ${toolLabel(kind).toLowerCase()} field (${TOOL_SHORTCUTS[kind]})`}
            onClick={() => pick(kind)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{toolLabel(kind)}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
