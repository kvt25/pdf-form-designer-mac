import { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, shell } from 'electron'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { isAbsolute, join, relative, resolve as resolvePath } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type {
  FormField,
  OpenPdfResult,
  SavePdfRequest,
  SavePdfResult,
  UnsavedChoice
} from '../shared/types'
import { toPdfBytes } from '../shared/bytes'
import { PDFJS_PROTOCOL_HOST, PDFJS_PROTOCOL_SCHEME } from '../shared/pdfjsAssets'
import { readTextFields } from './pdf-reader'
import { applyTextFields } from './pdf-writer'

let mainWindow: BrowserWindow | null = null
let dirty = false
let allowClose = false

protocol.registerSchemesAsPrivileged([
  {
    scheme: PDFJS_PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

function pdfjsAssetRoot(): string {
  if (is.dev) {
    return resolvePath(process.cwd(), 'node_modules/pdfjs-dist')
  }
  return join(__dirname, '../renderer/pdfjs')
}

function isPathInside(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

function pdfjsAssetFile(requestUrl: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(requestUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== `${PDFJS_PROTOCOL_SCHEME}:` || parsed.hostname !== PDFJS_PROTOCOL_HOST) {
    return null
  }
  const relativePath = decodeURIComponent(parsed.pathname).replace(/^\/+/, '')
  if (!relativePath || relativePath.includes('\0')) {
    return null
  }
  const root = pdfjsAssetRoot()
  const filePath = resolvePath(root, relativePath)
  if (!isPathInside(root, filePath) || !existsSync(filePath)) {
    return null
  }
  return filePath
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 880,
    minHeight: 600,
    show: false,
    title: 'PDF Form Designer',
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (allowClose || !dirty || !mainWindow) {
      return
    }
    event.preventDefault()
    mainWindow.webContents.send('app:close-requested')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    dirty = false
    allowClose = false
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function sendMenu(channel: 'menu:open' | 'menu:save' | 'menu:save-as'): void {
  mainWindow?.webContents.send(channel)
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            role: 'appMenu' as const
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenu('menu:open')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenu('menu:save')
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendMenu('menu:save-as')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function openPdf(): Promise<OpenPdfResult> {
  if (!mainWindow) {
    return { ok: false, canceled: true }
  }

  const picked = await dialog.showOpenDialog(mainWindow, {
    title: 'Open PDF',
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })

  if (picked.canceled || !picked.filePaths[0]) {
    return { ok: false, canceled: true }
  }

  const path = picked.filePaths[0]
  try {
    const bytes = toPdfBytes(await readFile(path))
    const fields = await readTextFields(bytes)
    return { ok: true, path, bytes, fields }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Could not open PDF',
      message
    })
    return { ok: false, canceled: false, error: message }
  }
}

async function writePdf(request: SavePdfRequest, saveAs: boolean): Promise<SavePdfResult> {
  if (!mainWindow) {
    return { ok: false, canceled: true }
  }

  let path = request.path
  if (saveAs || !path) {
    const picked = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF',
      defaultPath: path ?? 'form.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (picked.canceled || !picked.filePath) {
      return { ok: false, canceled: true }
    }
    path = picked.filePath
  }

  try {
    const bytes = await applyTextFields(toPdfBytes(request.bytes), request.fields as FormField[])
    await writeFile(path, bytes)
    return { ok: true, path, bytes }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Could not save PDF',
      message
    })
    return { ok: false, canceled: false, error: message }
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pdfformdesigner.app')

  protocol.handle(PDFJS_PROTOCOL_SCHEME, (request) => {
    const filePath = pdfjsAssetFile(request.url)
    if (!filePath) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).href)
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('pdf:open', () => openPdf())
  ipcMain.handle('pdf:save', (_event, request: SavePdfRequest) => writePdf(request, false))
  ipcMain.handle('pdf:save-as', (_event, request: SavePdfRequest) => writePdf(request, true))
  ipcMain.handle('dialog:unsaved', async (event): Promise<UnsavedChoice> => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return 'cancel'
    }
    const { response } = await dialog.showMessageBox(window, {
      type: 'warning',
      message: 'Do you want to save the changes you made to this PDF?',
      detail: 'Your changes will be lost if you do not save them.',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2
    })
    if (response === 0) {
      return 'save'
    }
    if (response === 1) {
      return 'discard'
    }
    return 'cancel'
  })
  ipcMain.handle('dialog:error', async (event, message: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return
    }
    await dialog.showMessageBox(window, {
      type: 'error',
      title: 'PDF Form Designer',
      message
    })
  })
  ipcMain.on('app:set-dirty', (_event, next: boolean) => {
    dirty = next
  })
  ipcMain.on('app:set-title', (event, title: string) => {
    BrowserWindow.fromWebContents(event.sender)?.setTitle(title)
  })
  ipcMain.on('app:allow-close', () => {
    allowClose = true
    mainWindow?.close()
  })

  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
