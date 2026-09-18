export type FieldKind = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'list' | 'button'

export type FormField = {
  id: string
  name: string
  kind: FieldKind
  page: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  multiline: boolean
  /** Text content, selected choice value, or button label. */
  defaultValue: string
  required: boolean
  readonly: boolean
  /** Text fields only; `null` means no limit. */
  maxLength: number | null
  /** Dropdown and list box options. */
  options: string[]
  /** Radio option value (and checkbox on-value, always `Yes`). */
  exportValue: string
  /** Default-selected state for checkbox and radio fields. */
  checked: boolean
  /** `#rrggbb`, or `null` for no border. */
  borderColor: string | null
  /** `#rrggbb`, or `null` for no fill. */
  backgroundColor: string | null
}

/** Extra control: leftover page annot, or an AcroForm field that is not a designed text field. */
export type OrphanWidget = {
  id: string
  name: string
  page: number
  x: number
  y: number
  width: number
  height: number
  fieldType: string | null
  flags: number
  kind: 'annot' | 'acro'
}

export type OpenPdfResult =
  | { ok: true; path: string; bytes: Uint8Array; fields: FormField[]; orphans: OrphanWidget[] }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string }

export type SavePdfRequest = {
  path?: string
  bytes: Uint8Array
  fields: FormField[]
  orphans: OrphanWidget[]
}

export type SavePdfResult =
  | { ok: true; path: string; bytes: Uint8Array }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string }

export type UnsavedChoice = 'save' | 'discard' | 'cancel'
