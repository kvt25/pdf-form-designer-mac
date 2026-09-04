import { toPdfBytes } from '../../../shared/bytes'
import { firstInvalidField } from './validation'
import { useEditorStore } from '../store/editorStore'

async function confirmLeaveIfDirty(): Promise<boolean> {
  const { doc } = useEditorStore.getState()
  if (doc.kind !== 'open' || !doc.dirty) {
    return true
  }
  const choice = await window.api.confirmUnsaved()
  if (choice === 'cancel') {
    return false
  }
  if (choice === 'discard') {
    return true
  }
  return saveDocument()
}

export async function openDocument(): Promise<void> {
  if (!(await confirmLeaveIfDirty())) {
    return
  }
  const result = await window.api.openPdf()
  if (!result.ok) {
    return
  }
  useEditorStore.getState().loadDocument(result.path, toPdfBytes(result.bytes), result.fields)
}

export async function saveDocument(): Promise<boolean> {
  const { doc } = useEditorStore.getState()
  if (doc.kind !== 'open') {
    return false
  }
  const invalid = firstInvalidField(doc.fields)
  if (invalid) {
    await window.api.showError(invalid)
    return false
  }
  const result = await window.api.savePdf({
    path: doc.path,
    bytes: doc.bytes,
    fields: doc.fields
  })
  if (!result.ok) {
    return false
  }
  useEditorStore.getState().markSaved(result.path, toPdfBytes(result.bytes))
  return true
}

export async function saveDocumentAs(): Promise<boolean> {
  const { doc } = useEditorStore.getState()
  if (doc.kind !== 'open') {
    return false
  }
  const invalid = firstInvalidField(doc.fields)
  if (invalid) {
    await window.api.showError(invalid)
    return false
  }
  const result = await window.api.savePdfAs({
    path: doc.path,
    bytes: doc.bytes,
    fields: doc.fields
  })
  if (!result.ok) {
    return false
  }
  useEditorStore.getState().markSaved(result.path, toPdfBytes(result.bytes))
  return true
}

export async function handleCloseRequested(): Promise<void> {
  if (!(await confirmLeaveIfDirty())) {
    return
  }
  window.api.confirmClose()
}
