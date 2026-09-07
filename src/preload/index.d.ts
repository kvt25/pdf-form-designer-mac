import type { FormField, OpenPdfResult, SavePdfResult, UnsavedChoice } from '../shared/types'

type MenuListener = () => void

interface DesktopApi {
  openPdf: () => Promise<OpenPdfResult>
  savePdf: (payload: {
    path: string
    bytes: Uint8Array
    fields: FormField[]
  }) => Promise<SavePdfResult>
  savePdfAs: (payload: {
    path?: string
    bytes: Uint8Array
    fields: FormField[]
  }) => Promise<SavePdfResult>
  confirmUnsaved: () => Promise<UnsavedChoice>
  showError: (message: string) => Promise<void>
  setDirty: (next: boolean) => void
  setTitle: (title: string) => void
  confirmClose: () => void
  onMenuOpen: (callback: MenuListener) => () => void
  onMenuSave: (callback: MenuListener) => () => void
  onMenuSaveAs: (callback: MenuListener) => () => void
  onMenuDuplicate: (callback: MenuListener) => () => void
  onCloseRequested: (callback: MenuListener) => () => void
}

declare global {
  interface Window {
    api: DesktopApi
  }
}

export {}
