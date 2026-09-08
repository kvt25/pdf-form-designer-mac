/** PDF field flag bits are 1-based in the spec (`1 << (bit - 1)`). */
const RADIO = 1 << 15
const PUSHBUTTON = 1 << 16
const COMBO = 1 << 17
const MULTILINE = 1 << 12
const PASSWORD = 1 << 13

export function orphanControlLabel(fieldType: string | null, flags: number): string {
  if (fieldType === 'PDFCheckBox') {
    return 'Checkbox'
  }
  if (fieldType === 'PDFRadioGroup') {
    return 'Radio button'
  }
  if (fieldType === 'PDFButton') {
    return 'Button'
  }
  if (fieldType === 'PDFDropdown') {
    return 'Dropdown'
  }
  if (fieldType === 'PDFOptionList') {
    return 'List box'
  }
  if (fieldType === 'PDFSignature' || fieldType === 'Sig') {
    return 'Signature'
  }
  if (fieldType === 'Btn') {
    if ((flags & PUSHBUTTON) !== 0) {
      return 'Button'
    }
    if ((flags & RADIO) !== 0) {
      return 'Radio button'
    }
    return 'Checkbox'
  }
  if (fieldType === 'Ch') {
    return (flags & COMBO) !== 0 ? 'Dropdown' : 'List box'
  }
  if (fieldType === 'Tx') {
    if ((flags & PASSWORD) !== 0) {
      return 'Password'
    }
    if ((flags & MULTILINE) !== 0) {
      return 'Multiline text'
    }
    return 'Text'
  }
  return fieldType ? `Widget (${fieldType})` : 'Widget'
}

const CONTROL_ORDER = [
  'Checkbox',
  'Radio button',
  'Button',
  'Text',
  'Multiline text',
  'Password',
  'Dropdown',
  'List box',
  'Signature'
]

export function groupOrphansByControl<T extends { fieldType: string | null; flags: number }>(
  orphans: T[]
): Array<{ label: string; items: T[] }> {
  const groups = new Map<string, T[]>()
  for (const orphan of orphans) {
    const label = orphanControlLabel(orphan.fieldType, orphan.flags)
    const items = groups.get(label) ?? []
    items.push(orphan)
    groups.set(label, items)
  }
  const known = CONTROL_ORDER.filter((label) => groups.has(label)).map((label) => ({
    label,
    items: groups.get(label) ?? []
  }))
  const extra = [...groups.keys()]
    .filter((label) => !CONTROL_ORDER.includes(label))
    .sort()
    .map((label) => ({ label, items: groups.get(label) ?? [] }))
  return [...known, ...extra]
}
