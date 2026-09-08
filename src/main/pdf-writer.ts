import { PDFTextField, rgb, StandardFonts, type RGB } from 'pdf-lib'
import { toPdfBytes } from '../shared/bytes'
import {
  DEFAULT_FIELD_BACKGROUND_COLOR,
  DEFAULT_FIELD_BORDER_COLOR,
  hexToRgbChannels
} from '../shared/color'
import type { FormField, OrphanWidget } from '../shared/types'
import { loadPdfDocumentAllowingEncryption } from './pdf-load'
import { removeUnkeptAcroControls, removeUnregisteredWidgets } from './pdf-reader'

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

export async function applyTextFields(
  source: Uint8Array,
  fields: FormField[],
  orphansToKeep: OrphanWidget[] = []
): Promise<Uint8Array> {
  const doc = await loadPdfDocumentAllowingEncryption(source)
  const form = doc.getForm()
  const pages = doc.getPages()

  const keepIds = new Set(orphansToKeep.map((item) => item.id))
  removeUnkeptAcroControls(doc, keepIds)
  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) {
      form.removeField(field)
    }
  }
  removeUnregisteredWidgets(doc, keepIds)

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

    const border = borderAppearance(spec)
    textField.addToPage(page, {
      x: spec.x,
      y: spec.y,
      width: spec.width,
      height: spec.height,
      borderWidth: border.borderWidth,
      borderColor: border.borderColor,
      backgroundColor: optionalRgb(spec.backgroundColor, FALLBACK_BACKGROUND),
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
