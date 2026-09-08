import {
  PDFArray,
  PDFButton,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFOptionList,
  PDFRadioGroup,
  PDFRef,
  PDFSignature,
  PDFString,
  PDFTextField,
  type PDFDocument,
  type PDFField
} from 'pdf-lib'
import { pdfColorComponentsToHex } from '../shared/color'
import type { FormField, OrphanWidget } from '../shared/types'
import { loadPdfDocument, type PdfLoadOptions } from './pdf-load'

const DEFAULT_FONT_SIZE = 12

type TextWidget = ReturnType<PDFTextField['acroField']['getWidgets']>[number]

export type PdfFormContents = {
  fields: FormField[]
  orphans: OrphanWidget[]
}

export async function readPdfForm(
  source: Uint8Array,
  options: PdfLoadOptions = {}
): Promise<PdfFormContents> {
  const doc = await loadPdfDocument(source, options)
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
      defaultValue: field.getText() ?? '',
      borderColor: readBorderColor(widget),
      backgroundColor: readBackgroundColor(widget)
    })
  }

  const inspect = inspectPageWidgets(doc)
  const orphans = [...readAcroExtras(doc, pages), ...inspect.unregistered.map(toOrphanWidget)]
  return { fields, orphans }
}

export async function readTextFields(
  source: Uint8Array,
  options: PdfLoadOptions = {}
): Promise<FormField[]> {
  return (await readPdfForm(source, options)).fields
}

type InspectedWidget = {
  id: string
  ref: PDFRef | null
  page: number
  name: string
  widgetFf: number
  fieldType: string | null
  rect: [number, number, number, number]
}

function inspectPageWidgets(doc: PDFDocument): { unregistered: InspectedWidget[] } {
  const form = doc.getForm()
  const pages = doc.getPages()
  const registeredRefs = new Set<string>()

  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const ref = widget.dict.context.getObjectRef(widget.dict)
      if (ref) {
        registeredRefs.add(ref.toString())
      }
    }
  }

  const unregistered: InspectedWidget[] = []
  for (let page = 0; page < pages.length; page += 1) {
    const annots = pages[page].node.Annots()
    if (!annots) {
      continue
    }
    for (const annot of annots.asArray()) {
      const dict = annot instanceof PDFRef ? doc.context.lookup(annot) : annot
      if (!(dict instanceof PDFDict)) {
        continue
      }
      if (dict.lookup(PDFName.of('Subtype')) !== PDFName.of('Widget')) {
        continue
      }
      const parent = dict.lookup(PDFName.of('Parent'))
      const parentDict = parent instanceof PDFDict ? parent : null
      const name =
        pdfText(dict.lookup(PDFName.of('T'))) ??
        pdfText(parentDict?.lookup(PDFName.of('T'))) ??
        'unnamed'
      const widgetFf = pdfNumber(dict.lookup(PDFName.of('Ff'))) ?? 0
      const parentFf = parentDict ? (pdfNumber(parentDict.lookup(PDFName.of('Ff'))) ?? 0) : 0
      const fieldType =
        pdfName(dict.lookup(PDFName.of('FT'))) ?? pdfName(parentDict?.lookup(PDFName.of('FT')))
      const rectArr = dict.lookup(PDFName.of('Rect'))
      const rect: InspectedWidget['rect'] = [0, 0, 0, 0]
      if (rectArr instanceof PDFArray) {
        const nums = rectArr.asArray().map((item) => pdfNumber(item) ?? 0)
        rect[0] = nums[0] ?? 0
        rect[1] = nums[1] ?? 0
        rect[2] = nums[2] ?? 0
        rect[3] = nums[3] ?? 0
      }
      const ref = annot instanceof PDFRef ? annot : dict.context.getObjectRef(dict)
      const registered = ref ? registeredRefs.has(ref.toString()) : false
      if (registered) {
        continue
      }
      unregistered.push({
        id: ref ? orphanId(ref) : `orphan:page${page}:${name}`,
        ref: ref instanceof PDFRef ? ref : null,
        page: page + 1,
        name,
        widgetFf: widgetFf | parentFf,
        fieldType,
        rect
      })
    }
  }

  return { unregistered }
}

function pdfText(value: unknown): string | null {
  if (value instanceof PDFString || value instanceof PDFHexString) {
    return value.decodeText()
  }
  return null
}

function pdfNumber(value: unknown): number | null {
  if (value instanceof PDFNumber) {
    return value.asNumber()
  }
  return null
}

function pdfName(value: unknown): string | null {
  if (value instanceof PDFName) {
    return value.decodeText()
  }
  return null
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

function readBorderColor(widget: TextWidget): string | null {
  const width = widget.getBorderStyle()?.getWidth()
  if (width === 0) {
    return null
  }
  const components = widget.getAppearanceCharacteristics()?.getBorderColor()
  return pdfColorComponentsToHex(components) ?? '#000000'
}

function readBackgroundColor(widget: TextWidget): string | null {
  const components = widget.getAppearanceCharacteristics()?.getBackgroundColor()
  return pdfColorComponentsToHex(components)
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

export function removeUnregisteredWidgets(doc: PDFDocument, keepIds: Set<string>): void {
  const inspect = inspectPageWidgets(doc)
  const byPage = new Map<number, PDFRef[]>()
  for (const widget of inspect.unregistered) {
    if (!widget.ref || keepIds.has(widget.id)) {
      continue
    }
    const pageIndex = widget.page - 1
    const refs = byPage.get(pageIndex) ?? []
    refs.push(widget.ref)
    byPage.set(pageIndex, refs)
  }
  const pages = doc.getPages()
  for (const [pageIndex, refs] of byPage) {
    const page = pages[pageIndex]
    if (!page) {
      continue
    }
    for (const ref of refs) {
      page.node.removeAnnot(ref)
    }
  }
}

export function removeUnkeptAcroControls(doc: PDFDocument, keepIds: Set<string>): void {
  for (const field of [...doc.getForm().getFields()]) {
    if (field instanceof PDFTextField) {
      continue
    }
    if (!keepIds.has(acroExtraId(field))) {
      removeAcroField(doc, field)
    }
  }
}

/** Drop an AcroForm field without using pdf-lib removeField, which requires /AP/N. */
export function removeAcroField(doc: PDFDocument, field: PDFField): void {
  const form = doc.getForm()
  const pages = doc.getPages()
  for (const widget of field.acroField.getWidgets()) {
    const widgetRef = widget.dict.context.getObjectRef(widget.dict) ?? field.ref
    const page = pages[pageIndexForWidget(pages, widget)]
    page?.node.removeAnnot(widgetRef)
    page?.node.removeAnnot(field.ref)
  }
  form.acroForm.removeField(field.acroField)
  const kids = field.acroField.Kids()
  if (kids) {
    for (const child of kids.asArray()) {
      if (child instanceof PDFRef) {
        doc.context.delete(child)
      }
    }
  }
  doc.context.delete(field.ref)
}

function readAcroExtras(
  doc: PDFDocument,
  pages: ReturnType<PDFDocument['getPages']>
): OrphanWidget[] {
  const extras: OrphanWidget[] = []
  for (const field of doc.getForm().getFields()) {
    if (field instanceof PDFTextField) {
      continue
    }
    const widget = field.acroField.getWidgets()[0]
    if (!widget) {
      continue
    }
    const rect = widget.getRectangle()
    extras.push({
      id: acroExtraId(field),
      name: field.getName(),
      page: pageIndexForWidget(pages, widget),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fieldType: acroFieldTypeName(field),
      flags: field.acroField.getFlags(),
      kind: 'acro'
    })
  }
  return extras
}

function acroExtraId(field: PDFField): string {
  return `acro:${field.getName()}`
}

function acroFieldTypeName(field: PDFField): string {
  if (field instanceof PDFCheckBox) {
    return 'PDFCheckBox'
  }
  if (field instanceof PDFRadioGroup) {
    return 'PDFRadioGroup'
  }
  if (field instanceof PDFButton) {
    return 'PDFButton'
  }
  if (field instanceof PDFDropdown) {
    return 'PDFDropdown'
  }
  if (field instanceof PDFOptionList) {
    return 'PDFOptionList'
  }
  if (field instanceof PDFSignature) {
    return 'PDFSignature'
  }
  return field.constructor.name
}

function toOrphanWidget(widget: InspectedWidget): OrphanWidget {
  return {
    id: widget.id,
    name: widget.name,
    page: widget.page - 1,
    x: widget.rect[0],
    y: widget.rect[1],
    width: widget.rect[2] - widget.rect[0],
    height: widget.rect[3] - widget.rect[1],
    fieldType: widget.fieldType,
    flags: widget.widgetFf,
    kind: 'annot'
  }
}

function orphanId(ref: PDFRef): string {
  return `orphan:${ref.objectNumber}:${ref.generationNumber}`
}
