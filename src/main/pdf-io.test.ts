import { EncryptedPDFError, PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { FormField } from '../shared/types'
import { DEFAULT_FIELD_BACKGROUND_COLOR, DEFAULT_FIELD_BORDER_COLOR } from '../shared/color'
import { orphanControlLabel } from '../shared/widgetType'
import { isEncryptedPdfError } from './pdf-load'
import { readPdfForm, readTextFields } from './pdf-reader'
import { applyTextFields } from './pdf-writer'

async function samplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  page.drawText('Customer name', { x: 72, y: 720, size: 12, font, color: rgb(0, 0, 0) })
  return doc.save()
}

function field(partial: Partial<FormField> & Pick<FormField, 'name'>): FormField {
  return {
    id: partial.id ?? partial.name,
    name: partial.name,
    page: partial.page ?? 0,
    x: partial.x ?? 180,
    y: partial.y ?? 708,
    width: partial.width ?? 240,
    height: partial.height ?? 20,
    fontSize: partial.fontSize ?? 12,
    multiline: partial.multiline ?? false,
    defaultValue: partial.defaultValue ?? '',
    borderColor:
      partial.borderColor === undefined ? DEFAULT_FIELD_BORDER_COLOR : partial.borderColor,
    backgroundColor:
      partial.backgroundColor === undefined
        ? DEFAULT_FIELD_BACKGROUND_COLOR
        : partial.backgroundColor
  }
}

test('applyTextFields writes named AcroForm text fields that readTextFields round-trips', async () => {
  const source = await samplePdf()
  const written = await applyTextFields(source, [
    field({ name: 'customerName', defaultValue: 'Ada' }),
    field({ name: 'orderId', x: 180, y: 660, width: 120 })
  ])

  const fields = await readTextFields(written)
  assert.deepEqual(fields.map((item) => item.name).sort(), ['customerName', 'orderId'])

  const customer = fields.find((item) => item.name === 'customerName')
  assert.ok(customer)
  assert.equal(customer.defaultValue, 'Ada')
  assert.equal(customer.borderColor, DEFAULT_FIELD_BORDER_COLOR)
  assert.equal(customer.backgroundColor, DEFAULT_FIELD_BACKGROUND_COLOR)
  assert.ok(Math.abs(customer.x - 180) < 2)
  assert.ok(Math.abs(customer.width - 240) < 2)

  const dir = await mkdtemp(join(tmpdir(), 'pdf-form-'))
  await writeFile(join(dir, 'form.pdf'), written)
})

test('readTextFields can ignore encryption on an unencrypted PDF', async () => {
  const source = await samplePdf()
  const written = await applyTextFields(source, [field({ name: 'customerName' })])
  const fields = await readTextFields(written, { ignoreEncryption: true })
  assert.deepEqual(
    fields.map((item) => item.name),
    ['customerName']
  )
})

test('isEncryptedPdfError recognizes pdf-lib encrypted load errors', () => {
  assert.equal(isEncryptedPdfError(new EncryptedPDFError()), true)
  assert.equal(isEncryptedPdfError(new Error('unrelated')), false)
})

test('applyTextFields round-trips custom and missing text field borders and fills', async () => {
  const source = await samplePdf()
  const written = await applyTextFields(source, [
    field({ name: 'redBorder', borderColor: '#cc3344', backgroundColor: '#fff3b0' }),
    field({ name: 'noChrome', x: 180, y: 660, borderColor: null, backgroundColor: null })
  ])

  const fields = await readTextFields(written)
  const red = fields.find((item) => item.name === 'redBorder')
  const none = fields.find((item) => item.name === 'noChrome')
  assert.ok(red)
  assert.ok(none)
  assert.equal(red.borderColor, '#cc3344')
  assert.equal(red.backgroundColor, '#fff3b0')
  assert.equal(none.borderColor, null)
  assert.equal(none.backgroundColor, null)
})

test('readPdfForm finds unregistered page widgets and applyTextFields can strip them', async () => {
  const source = await pdfWithOrphanWidget('Text4.0')
  const loaded = await readPdfForm(source)
  assert.equal(loaded.orphans.length, 1)
  assert.equal(loaded.orphans[0]?.name, 'Text4.0')
  assert.equal(loaded.orphans[0]?.fieldType, 'Tx')
  assert.equal(loaded.orphans[0]?.kind, 'annot')
  assert.equal(loaded.orphans[0]?.flags, 0)

  const kept = await applyTextFields(source, [], loaded.orphans)
  const stillThere = await readPdfForm(kept)
  assert.equal(stillThere.orphans.length, 1)
  assert.equal(stillThere.orphans[0]?.name, 'Text4.0')

  const stripped = await applyTextFields(source, [], [])
  const gone = await readPdfForm(stripped)
  assert.equal(gone.orphans.length, 0)
})

test('readPdfForm lists registered checkboxes as extra widgets and can strip them', async () => {
  const names = ['Fortnightly', 'Monthly', 'Other', 'Weekly']
  const source = await pdfWithCheckboxes(['Monthly', 'Fortnightly', 'Weekly', 'Other'])
  const loaded = await readPdfForm(source)
  assert.equal(loaded.fields.length, 0)
  assert.deepEqual(loaded.orphans.map((item) => item.name).sort(), names)
  for (const extra of loaded.orphans) {
    assert.equal(extra.kind, 'acro')
    assert.equal(extra.fieldType, 'PDFCheckBox')
    assert.equal(orphanControlLabel(extra.fieldType, extra.flags), 'Checkbox')
  }

  const kept = await applyTextFields(source, [], loaded.orphans)
  const stillThere = await readPdfForm(kept)
  assert.deepEqual(stillThere.orphans.map((item) => item.name).sort(), names)

  const stripped = await applyTextFields(source, [], [])
  const gone = await readPdfForm(stripped)
  assert.equal(gone.orphans.length, 0)
})

test('orphan button widgets are classified as checkbox, radio, or push button', async () => {
  const source = await pdfWithOrphanWidgets([
    { name: 'agree', ft: 'Btn', ff: 0 },
    { name: 'choice', ft: 'Btn', ff: 1 << 15 },
    { name: 'go', ft: 'Btn', ff: 1 << 16 }
  ])
  const loaded = await readPdfForm(source)
  const byName = Object.fromEntries(
    loaded.orphans.map((item) => [item.name, orphanControlLabel(item.fieldType, item.flags)])
  )
  assert.equal(byName.agree, 'Checkbox')
  assert.equal(byName.choice, 'Radio button')
  assert.equal(byName.go, 'Button')
})

async function pdfWithCheckboxes(names: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const form = doc.getForm()
  names.forEach((name, index) => {
    form.createCheckBox(name).addToPage(page, {
      x: 72,
      y: 700 - index * 24,
      width: 14,
      height: 14
    })
  })
  return doc.save()
}

async function pdfWithOrphanWidget(name: string): Promise<Uint8Array> {
  return pdfWithOrphanWidgets([{ name, ft: 'Tx', ff: 0 }])
}

async function pdfWithOrphanWidgets(
  specs: Array<{ name: string; ft: string; ff: number }>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  for (const spec of specs) {
    const widget = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: PDFName.of(spec.ft),
      T: PDFString.of(spec.name),
      Ff: spec.ff,
      Rect: [156, 745, 580, 811],
      P: page.ref,
      F: 4
    })
    page.node.addAnnot(doc.context.register(widget))
  }
  return doc.save()
}
