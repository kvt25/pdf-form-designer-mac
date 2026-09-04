export type FormField = {
  id: string
  name: string
  page: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  multiline: boolean
  defaultValue: string
}

export type OpenPdfResult =
  | { ok: true; path: string; bytes: Uint8Array; fields: FormField[] }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string }

export type SavePdfRequest = {
  path?: string
  bytes: Uint8Array
  fields: FormField[]
}

export type SavePdfResult =
  | { ok: true; path: string; bytes: Uint8Array }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string }

export type UnsavedChoice = 'save' | 'discard' | 'cancel'
