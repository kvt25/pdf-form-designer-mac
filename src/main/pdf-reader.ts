import { PDFDocument, PDFTextField } from 'pdf-lib'
import { toPdfBytes } from '../shared/bytes'
import type { FormField } from '../shared/types'

const DEFAULT_FONT_SIZE = 12

type TextWidget = ReturnType<PDFTextField['acroField']['getWidgets']>[number]

export async function readTextFields(source: Uint8Array): Promise<FormField[]> {
  const doc = await PDFDocument.load(toPdfBytes(source))
  const form = doc.getForm()
  const pages = doc.getPages()
  const fields: FormField[] = []

  for (const field of form.getFields()) {
    if (!(field instanceof PDFTextField)) {
      continue
    }

    const widget = field.acroField.getWidgets()[0]
    if (!widget) {
      continue
    }

    const rect = widget.getRectangle()
    const name = field.getName()
    fields.push({
      id: name,
      name,
      page: pageIndexForWidget(pages, widget),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fontSize: readFontSize(field),
      multiline: field.isMultiline(),
      defaultValue: field.getText() ?? ''
    })
  }

  return fields
}

function pageIndexForWidget(
  pages: ReturnType<PDFDocument['getPages']>,
  widget: TextWidget
): number {
  const pageRef = widget.P()
  if (pageRef) {
    const index = pages.findIndex((page) => page.ref === pageRef)
    if (index >= 0) {
      return index
    }
  }

  const widgetRef = widget.dict.context.getObjectRef(widget.dict)
  if (!widgetRef) {
    return 0
  }

  for (let index = 0; index < pages.length; index += 1) {
    const annots = pages[index].node.Annots()
    if (!annots) {
      continue
    }
    for (const annot of annots.asArray()) {
      if (annot === widgetRef) {
        return index
      }
    }
  }

  return 0
}

function readFontSize(field: PDFTextField): number {
  const appearance = field.acroField.getDefaultAppearance()
  const match = appearance?.match(/(\d+(?:\.\d+)?)\s+Tf/)
  if (!match) {
    return DEFAULT_FONT_SIZE
  }
  const size = Number(match[1])
  return Number.isFinite(size) && size > 0 ? size : DEFAULT_FONT_SIZE
}
