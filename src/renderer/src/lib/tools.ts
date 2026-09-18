import {
  ChevronDown,
  CircleDot,
  List,
  MousePointer2,
  RectangleHorizontal,
  SquareCheckBig,
  Type,
  type LucideIcon
} from 'lucide-react'
import type { FieldKind } from '../../../shared/types'
import { fieldKindLabel } from '../../../shared/widgetType'
import type { Tool } from '../store/editorStore'

export const TOOL_SHORTCUTS: Record<Tool, string> = {
  select: 'V',
  text: 'T',
  checkbox: 'C',
  radio: 'R',
  dropdown: 'D',
  list: 'L',
  button: 'B'
}

export const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  t: 'text',
  c: 'checkbox',
  r: 'radio',
  d: 'dropdown',
  l: 'list',
  b: 'button'
}

export const SELECT_TOOL_ICON: LucideIcon = MousePointer2

export const FIELD_TOOLS: Array<{ kind: FieldKind; icon: LucideIcon }> = [
  { kind: 'text', icon: Type },
  { kind: 'checkbox', icon: SquareCheckBig },
  { kind: 'radio', icon: CircleDot },
  { kind: 'dropdown', icon: ChevronDown },
  { kind: 'list', icon: List },
  { kind: 'button', icon: RectangleHorizontal }
]

export function toolLabel(tool: Tool): string {
  return tool === 'select' ? 'Select' : fieldKindLabel(tool)
}
