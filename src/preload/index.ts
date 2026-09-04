import { contextBridge, ipcRenderer } from 'electron'
import type { FormField, OpenPdfResult, SavePdfResult, UnsavedChoice } from '../shared/types'

type MenuListener = () => void

function onChannel(channel: string, callback: MenuListener): () => void {
  const listener = (): void => {
    callback()
  }
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api = {
  openPdf: (): Promise<OpenPdfResult> => ipcRenderer.invoke('pdf:open'),
  savePdf: (payload: {
    path: string
    bytes: Uint8Array
    fields: FormField[]
  }): Promise<SavePdfResult> => ipcRenderer.invoke('pdf:save', payload),
  savePdfAs: (payload: {
    path?: string
    bytes: Uint8Array
    fields: FormField[]
  }): Promise<SavePdfResult> => ipcRenderer.invoke('pdf:save-as', payload),
  confirmUnsaved: (): Promise<UnsavedChoice> => ipcRenderer.invoke('dialog:unsaved'),
  showError: (message: string): Promise<void> => ipcRenderer.invoke('dialog:error', message),
  setDirty: (next: boolean): void => {
    ipcRenderer.send('app:set-dirty', next)
  },
  setTitle: (title: string): void => {
    ipcRenderer.send('app:set-title', title)
  },
  confirmClose: (): void => {
    ipcRenderer.send('app:allow-close')
  },
  onMenuOpen: (callback: MenuListener) => onChannel('menu:open', callback),
  onMenuSave: (callback: MenuListener) => onChannel('menu:save', callback),
  onMenuSaveAs: (callback: MenuListener) => onChannel('menu:save-as', callback),
  onCloseRequested: (callback: MenuListener) => onChannel('app:close-requested', callback)
}

export type DesktopApi = typeof api

contextBridge.exposeInMainWorld('api', api)
