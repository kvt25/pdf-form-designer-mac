import { EncryptedPDFError, PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { FormField } from '../shared/types'
import { isEncryptedPdfError } from './pdf-load'
import { readTextFields } from './pdf-reader'
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
    defaultValue: partial.defaultValue ?? ''
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
