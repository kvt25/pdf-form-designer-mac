import { PDFDocument, PDFTextField, rgb, StandardFonts } from 'pdf-lib'
import { toPdfBytes } from '../shared/bytes'
import type { FormField } from '../shared/types'

const FIELD_BORDER = rgb(0.35, 0.45, 0.62)
const FIELD_BACKGROUND = rgb(1, 1, 1)
const FIELD_TEXT = rgb(0, 0, 0)

export async function applyTextFields(
  source: Uint8Array,
  fields: FormField[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toPdfBytes(source))
  const form = doc.getForm()
  const pages = doc.getPages()

  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) {
      form.removeField(field)
    }
  }

  for (const spec of fields) {
    const page = pages[spec.page]
    if (!page) {
      throw new Error(`Field "${spec.name}" references missing page ${spec.page}`)
    }

    const textField = form.createTextField(spec.name)
    if (spec.multiline) {
      textField.enableMultiline()
    }
    if (spec.defaultValue) {
      textField.setText(spec.defaultValue)
    }

    textField.addToPage(page, {
      x: spec.x,
      y: spec.y,
      width: spec.width,
      height: spec.height,
      borderWidth: 1,
      borderColor: FIELD_BORDER,
      backgroundColor: FIELD_BACKGROUND,
      textColor: FIELD_TEXT
    })

    try {
      textField.setFontSize(spec.fontSize)
    } catch {
      // Some PDFs lack a /DA string until appearances are generated.
    }
  }

  const font = await doc.embedFont(StandardFonts.Helvetica)
  form.updateFieldAppearances(font)
  return toPdfBytes(await doc.save({ useObjectStreams: false }))
}
