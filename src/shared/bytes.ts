export function toPdfBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return new Uint8Array(value)
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }
  if (ArrayBuffer.isView(value)) {
    const view = value
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice()
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    return Uint8Array.from(value)
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: unknown }).type === 'Buffer' &&
    'data' in value &&
    Array.isArray((value as { data: unknown }).data)
  ) {
    return Uint8Array.from((value as { data: number[] }).data)
  }
  throw new Error('Invalid PDF byte payload')
}
