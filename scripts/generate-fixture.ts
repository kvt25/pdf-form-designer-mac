import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { applyTextFields } from '../src/main/pdf-writer'
import type { FormField } from '../src/shared/types'
import { DEFAULT_FIELD_BACKGROUND_COLOR, DEFAULT_FIELD_BORDER_COLOR } from '../src/shared/color'

const output = join(
  dirname(fileURLToPath(import.meta.url)),
  '../java-filler/src/test/resources/sample-form.pdf'
)

function field(name: string, x: number, y: number, width: number): FormField {
  return {
    id: name,
    name,
    kind: 'text',
    page: 0,
    x,
    y,
    width,
    height: 20,
    fontSize: 12,
    multiline: false,
    defaultValue: '',
    required: false,
    readonly: false,
    maxLength: null,
    options: [],
    exportValue: '',
    checked: false,
    borderColor: DEFAULT_FIELD_BORDER_COLOR,
    backgroundColor: DEFAULT_FIELD_BACKGROUND_COLOR
  }
}

async function main(): Promise<void> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  page.drawText('Sample order form', { x: 72, y: 720, size: 18, font, color: rgb(0.1, 0.1, 0.1) })
  page.drawText('Customer name', { x: 72, y: 662, size: 11, font })
  page.drawText('Order ID', { x: 72, y: 612, size: 11, font })
  const withFields = await applyTextFields(await doc.save(), [
    field('customerName', 180, 650, 280),
    field('orderId', 180, 600, 160)
  ])
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, withFields)
}

void main()
