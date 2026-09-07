import type { FormField } from '../../../shared/types'

export const FIELD_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/

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
  if (fields.some((field) => field.id !== currentId && field.name === name)) {
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
  return null
}

export function nextFieldName(fields: FormField[]): string {
  const used = new Set(fields.map((field) => field.name))
  let index = 1
  while (used.has(`text${index}`)) {
    index += 1
  }
  return `text${index}`
}

export function uniqueFieldName(sourceName: string, fields: FormField[]): string {
  if (/^text\d+$/.test(sourceName)) {
    return nextFieldName(fields)
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
