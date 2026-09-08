/** Matches the previous hard-coded pdf-lib `rgb(0.35, 0.45, 0.62)` border. */
export const DEFAULT_FIELD_BORDER_COLOR = '#59739e'

/** Matches the previous hard-coded pdf-lib `rgb(1, 1, 1)` fill. */
export const DEFAULT_FIELD_BACKGROUND_COLOR = '#ffffff'

export function hexToRgbChannels(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) {
    return null
  }
  const value = Number.parseInt(match[1], 16)
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  }
}

export function rgbChannelsToHex(r: number, g: number, b: number): string {
  const byte = (channel: number): string =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

export function pdfColorComponentsToHex(components: number[] | undefined): string | null {
  if (!components || components.length === 0) {
    return null
  }
  if (components.length === 1) {
    return rgbChannelsToHex(components[0], components[0], components[0])
  }
  if (components.length === 3) {
    return rgbChannelsToHex(components[0], components[1], components[2])
  }
  if (components.length === 4) {
    const [cyan, magenta, yellow, key] = components
    return rgbChannelsToHex(
      1 - Math.min(1, cyan * (1 - key) + key),
      1 - Math.min(1, magenta * (1 - key) + key),
      1 - Math.min(1, yellow * (1 - key) + key)
    )
  }
  return null
}
