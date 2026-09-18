import type { FieldKind, FormField } from '../../../shared/types'

export const FIELD_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/

const NAME_PREFIX: Record<FieldKind, string> = {
  text: 'text',
  checkbox: 'checkbox',
  radio: 'radio',
  dropdown: 'dropdown',
  list: 'list',
  button: 'button'
}

export function validateFieldName(
  name: string,
  fields: FormField[],
  currentId: string
): string | null {
  if (!name.trim()) {
    return 'Each field needs a name.'
  }
  if (!FIELD_NAME_PATTERN.test(name)) {
    return 'Names can only use letters, numbers, underscore, dot, or hyphen.'
  }
  const current = fields.find((field) => field.id === currentId)
  const clash = fields.some((field) => {
    if (field.id === currentId || field.name !== name) {
      return false
    }
    // Radio buttons that share a name are options of one group, not a clash.
    if (current?.kind === 'radio' && field.kind === 'radio') {
      return false
    }
    return true
  })
  if (clash) {
    return `The name "${name}" is already used.`
  }
  return null
}

export function firstInvalidField(fields: FormField[]): string | null {
  for (const field of fields) {
    const error = validateFieldName(field.name, fields, field.id)
    if (error) {
      return error
    }
  }
  const radioError = firstDuplicateRadioOption(fields)
  if (radioError) {
    return radioError
  }
  return null
}

function firstDuplicateRadioOption(fields: FormField[]): string | null {
  const seen = new Set<string>()
  for (const field of fields) {
    if (field.kind !== 'radio') {
      continue
    }
    const key = `${field.name}::${field.exportValue || field.name}`
    if (seen.has(key)) {
      return `Radio group "${field.name}" has two options with the value "${field.exportValue || field.name}".`
    }
    seen.add(key)
  }
  return null
}

export function nextFieldName(fields: FormField[], kind: FieldKind = 'text'): string {
  const used = new Set(fields.map((field) => field.name))
  const prefix = NAME_PREFIX[kind]
  let index = 1
  while (used.has(`${prefix}${index}`)) {
    index += 1
  }
  return `${prefix}${index}`
}

export function uniqueFieldName(
  sourceName: string,
  fields: FormField[],
  kind: FieldKind = 'text'
): string {
  if (/^(text|checkbox|radio|dropdown|list|button)\d+$/.test(sourceName)) {
    return nextFieldName(fields, kind)
  }
  const used = new Set(fields.map((field) => field.name))
  const stem = sourceName.replace(/_\d+$/, '') || sourceName
  if (!used.has(stem)) {
    return stem
  }
  let index = 2
  while (used.has(`${stem}_${index}`)) {
    index += 1
  }
  return `${stem}_${index}`
}

/** Radio options in one group need distinct export values; clones get a suffix. */
export function uniqueRadioExportValue(
  sourceValue: string,
  groupName: string,
  fields: FormField[]
): string {
  const used = new Set(
    fields
      .filter((field) => field.kind === 'radio' && field.name === groupName)
      .map((field) => field.exportValue)
  )
  const stem = sourceValue.replace(/_\d+$/, '') || sourceValue || 'option'
  if (!used.has(stem)) {
    return stem
  }
  let index = 2
  while (used.has(`${stem}_${index}`)) {
    index += 1
  }
  return `${stem}_${index}`
}

export function nextRadioExportValue(groupName: string, fields: FormField[]): string {
  const used = new Set(
    fields
      .filter((field) => field.kind === 'radio' && field.name === groupName)
      .map((field) => field.exportValue)
  )
  let index = used.size + 1
  while (used.has(`option${index}`)) {
    index += 1
  }
  return `option${index}`
}
