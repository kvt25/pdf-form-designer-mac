import {
  PDFTextField,
  rgb,
  StandardFonts,
  type PDFField,
  type PDFForm,
  type PDFPage,
  type RGB
} from 'pdf-lib'
import { toPdfBytes } from '../shared/bytes'
import {
  DEFAULT_FIELD_BACKGROUND_COLOR,
  DEFAULT_FIELD_BORDER_COLOR,
  hexToRgbChannels
} from '../shared/color'
import type { FormField, OrphanWidget } from '../shared/types'
import { loadPdfDocumentAllowingEncryption } from './pdf-load'
import { removeAcroField, removeUnkeptAcroControls, removeUnregisteredWidgets } from './pdf-reader'

const FIELD_TEXT = rgb(0, 0, 0)
const FALLBACK_BORDER = rgbFromHex(DEFAULT_FIELD_BORDER_COLOR) ?? rgb(0.35, 0.45, 0.62)
const FALLBACK_BACKGROUND = rgbFromHex(DEFAULT_FIELD_BACKGROUND_COLOR) ?? rgb(1, 1, 1)

function rgbFromHex(hex: string): RGB | null {
  const channels = hexToRgbChannels(hex)
  if (!channels) {
    return null
  }
  return rgb(channels.r, channels.g, channels.b)
}

function optionalRgb(hex: string | null, fallback: RGB): RGB | undefined {
  if (hex === null) {
    return undefined
  }
  return rgbFromHex(hex) ?? fallback
}

function borderAppearance(spec: FormField): { borderWidth: number; borderColor: RGB | undefined } {
  const borderColor = optionalRgb(spec.borderColor, FALLBACK_BORDER)
  return {
    borderWidth: borderColor ? 1 : 0,
    borderColor
  }
}

type WidgetAppearance = {
  x: number
  y: number
  width: number
  height: number
  borderWidth: number
  borderColor: RGB | undefined
  backgroundColor: RGB | undefined
}

function widgetAppearance(spec: FormField): WidgetAppearance {
  const border = borderAppearance(spec)
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    borderWidth: border.borderWidth,
    borderColor: border.borderColor,
    backgroundColor: optionalRgb(spec.backgroundColor, FALLBACK_BACKGROUND)
  }
}

function applyFlags(field: PDFField, spec: FormField): void {
  if (spec.required) {
    field.enableRequired()
  } else {
    field.disableRequired()
  }
  if (spec.readonly) {
    field.enableReadOnly()
  } else {
    field.disableReadOnly()
  }
}

function missingPage(spec: FormField): Error {
  return new Error(`Field "${spec.name}" references missing page ${spec.page}`)
}

function addTextField(form: PDFForm, page: PDFPage, spec: FormField): void {
  const textField = form.createTextField(spec.name)
  if (spec.multiline) {
    textField.enableMultiline()
  }
  if (spec.defaultValue) {
    textField.setText(spec.defaultValue)
  }
  if (spec.maxLength != null) {
    textField.setMaxLength(spec.maxLength)
  } else {
    textField.removeMaxLength()
  }
  textField.addToPage(page, { ...widgetAppearance(spec), textColor: FIELD_TEXT })

  try {
    textField.setFontSize(spec.fontSize)
  } catch {
    // Some PDFs lack a /DA string until appearances are generated.
  }
  applyFlags(textField, spec)
}

function addCheckBox(form: PDFForm, page: PDFPage, spec: FormField): void {
  const checkBox = form.createCheckBox(spec.name)
  if (spec.checked) {
    checkBox.check()
  } else {
    checkBox.uncheck()
  }
  checkBox.addToPage(page, widgetAppearance(spec))
  applyFlags(checkBox, spec)
}

function addChoiceField(form: PDFForm, page: PDFPage, spec: FormField): void {
  const choice =
    spec.kind === 'dropdown' ? form.createDropdown(spec.name) : form.createOptionList(spec.name)
  if (spec.options.length > 0) {
    choice.setOptions(spec.options)
  }
  if (spec.defaultValue && spec.options.includes(spec.defaultValue)) {
    choice.select(spec.defaultValue)
  }
  choice.addToPage(page, { ...widgetAppearance(spec), textColor: FIELD_TEXT })
  try {
    choice.setFontSize(spec.fontSize)
  } catch {
    // Some PDFs lack a /DA string until appearances are generated.
  }
  applyFlags(choice, spec)
}

function addButton(form: PDFForm, page: PDFPage, spec: FormField): void {
  const button = form.createButton(spec.name)
  button.addToPage(spec.defaultValue || spec.name, page, {
    ...widgetAppearance(spec),
    textColor: FIELD_TEXT
  })
  try {
    button.setFontSize(spec.fontSize)
  } catch {
    // Some PDFs lack a /DA string until appearances are generated.
  }
  // The Required flag is meaningless on push buttons, so only readonly applies.
  if (spec.readonly) {
    button.enableReadOnly()
  } else {
    button.disableReadOnly()
  }
}

function addRadioGroup(form: PDFForm, pages: PDFPage[], name: string, members: FormField[]): void {
  const first = members[0]
  if (!first) {
    return
  }
  const group = form.createRadioGroup(name)
  for (const member of members) {
    const page = pages[member.page]
    if (!page) {
      throw missingPage(member)
    }
    group.addOptionToPage(member.exportValue || member.name, page, widgetAppearance(member))
  }
  const selected = members.find((member) => member.checked)
  if (selected) {
    group.select(selected.exportValue || selected.name)
  }
  applyFlags(group, first)
}

export async function applyFields(
  source: Uint8Array,
  fields: FormField[],
  orphansToKeep: OrphanWidget[] = []
): Promise<Uint8Array> {
  const doc = await loadPdfDocumentAllowingEncryption(source)
  const form = doc.getForm()
  const pages = doc.getPages()

  const keepIds = new Set(orphansToKeep.map((item) => item.id))
  removeUnkeptAcroControls(doc, keepIds)
  for (const field of [...form.getFields()]) {
    if (field instanceof PDFTextField) {
      removeAcroField(doc, field)
    }
  }
  removeUnregisteredWidgets(doc, keepIds)

  const radioGroups = new Map<string, FormField[]>()
  for (const spec of fields) {
    if (spec.kind === 'radio') {
      const group = radioGroups.get(spec.name) ?? []
      group.push(spec)
      radioGroups.set(spec.name, group)
      continue
    }
    const page = pages[spec.page]
    if (!page) {
      throw missingPage(spec)
    }
    switch (spec.kind) {
      case 'text':
        addTextField(form, page, spec)
        break
      case 'checkbox':
        addCheckBox(form, page, spec)
        break
      case 'dropdown':
      case 'list':
        addChoiceField(form, page, spec)
        break
      case 'button':
        addButton(form, page, spec)
        break
    }
  }
  for (const [name, members] of radioGroups) {
    addRadioGroup(form, pages, name, members)
  }

  const font = await doc.embedFont(StandardFonts.Helvetica)
  form.updateFieldAppearances(font)
  return toPdfBytes(await doc.save({ useObjectStreams: false }))
}

/**
 * Backward-compatible alias kept for the java-filler fixture and older callers.
 * Removal already strips every field type that is not kept, so delegating to
 * `applyFields` preserves the original "rewrite text fields" behavior.
 */
export async function applyTextFields(
  source: Uint8Array,
  fields: FormField[],
  orphansToKeep: OrphanWidget[] = []
): Promise<Uint8Array> {
  return applyFields(source, fields, orphansToKeep)
}
