import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { toast } from 'sonner'
import type { FileEntry, UploadItem } from '@shared/types'

interface FsState {
  currentPath: string
  entries: FileEntry[]
  loading: boolean
  error: string | null
  uploads: UploadItem[]
}

type FsAction =
  | { type: 'LOAD_START'; path: string }
  | { type: 'LOAD_DONE'; entries: FileEntry[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'UPLOAD_QUEUE'; item: UploadItem }
  | { type: 'UPLOAD_PROGRESS'; id: string; pct: number }
  | { type: 'UPLOAD_DONE'; id: string }
  | { type: 'UPLOAD_ERROR'; id: string; message: string }
  | { type: 'UPLOAD_DISMISS'; id: string }

function fsReducer(state: FsState, action: FsAction): FsState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null, currentPath: action.path }
    case 'LOAD_DONE':
      return { ...state, loading: false, entries: action.entries }
    case 'LOAD_ERROR':
      return { ...state, loading: false, entries: [], error: action.message }
    case 'UPLOAD_QUEUE':
      return { ...state, uploads: [...state.uploads, action.item] }
    case 'UPLOAD_PROGRESS':
      return {
        ...state,
        uploads: state.uploads.map((u) =>
          u.id === action.id ? { ...u, pct: action.pct, status: 'uploading' } : u
        )
      }
    case 'UPLOAD_DONE':
      return {
        ...state,
        uploads: state.uploads.map((u) =>
          u.id === action.id ? { ...u, pct: 100, status: 'done' } : u
        )
      }
    case 'UPLOAD_ERROR':
      return {
        ...state,
        uploads: state.uploads.map((u) =>
          u.id === action.id ? { ...u, status: 'error', error: action.message } : u
        )
      }
    case 'UPLOAD_DISMISS':
      return { ...state, uploads: state.uploads.filter((u) => u.id !== action.id) }
    default:
      return state
  }
}

interface FsContextValue extends FsState {
  navigate(path: string): void
  queueUpload(localPath: string, filename: string): void
  dismissUpload(id: string): void
  deleteEntry(path: string, isDir: boolean): Promise<void>
  createFolder(name: string): Promise<void>
}

const FsContext = createContext<FsContextValue | null>(null)

// `Personal` and `Projects/<name>` are real subdirectories under the user's
// SFTP home on sdata.nels.elixir.no. We never expose the raw $HOME root
// because writes there aren't managed by NeLS (the web UI can't delete them).
export const DEFAULT_PATH = 'Personal'

export function FsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(fsReducer, {
    currentPath: DEFAULT_PATH,
    entries: [],
    loading: true,
    error: null,
    uploads: [],
  })

  const navigate = useCallback((path: string) => {
    dispatch({ type: 'LOAD_START', path })
    window.nels.fs.list(path)
      .then((entries) => dispatch({ type: 'LOAD_DONE', entries }))
      .catch((err: Error) => dispatch({ type: 'LOAD_ERROR', message: err.message }))
  }, [])

  useEffect(() => {
    navigate(DEFAULT_PATH)
  }, [navigate])

  useEffect(() => {
    const offProgress = window.nels.on('upload:progress', (data) => {
      dispatch({ type: 'UPLOAD_PROGRESS', id: data.id, pct: data.pct })
    })
    const offDone = window.nels.on('upload:done', (data) => {
      dispatch({ type: 'UPLOAD_DONE', id: data.id })
    })
    const offError = window.nels.on('upload:error', (data) => {
      dispatch({ type: 'UPLOAD_ERROR', id: data.id, message: data.message })
    })
    return () => { offProgress(); offDone(); offError() }
  }, [])

  const queueUpload = useCallback((localPath: string, filename: string) => {
    if (!localPath) {
      toast.error(`Could not resolve local file path for ${filename}`)
      return
    }
    const id = crypto.randomUUID()
    const remotePath = `${state.currentPath}/${filename}`
    const item: UploadItem = { id, localPath, remotePath, pct: 0, status: 'queued' }
    dispatch({ type: 'UPLOAD_QUEUE', item })
    window.nels.fs.upload(localPath, remotePath, id).catch((err: Error) => {
      dispatch({ type: 'UPLOAD_ERROR', id, message: err.message })
    })
  }, [state.currentPath])

  const dismissUpload = useCallback((id: string) => {
    dispatch({ type: 'UPLOAD_DISMISS', id })
  }, [])

  const refreshCurrent = useCallback(async () => {
    dispatch({ type: 'LOAD_START', path: state.currentPath })
    try {
      const entries = await window.nels.fs.list(state.currentPath)
      dispatch({ type: 'LOAD_DONE', entries })
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', message: (err as Error).message })
    }
  }, [state.currentPath])

  const deleteEntry = useCallback(async (path: string, isDir: boolean) => {
    await window.nels.fs.delete(path, isDir)
    await refreshCurrent()
  }, [refreshCurrent])

  const createFolder = useCallback(async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Folder name is required')
    if (trimmed.includes('/')) throw new Error('Folder name cannot contain "/"')
    if (trimmed === '.' || trimmed === '..') throw new Error('Invalid folder name')
    const path = `${state.currentPath}/${trimmed}`
    await window.nels.fs.mkdir(path)
    await refreshCurrent()
  }, [state.currentPath, refreshCurrent])

  return (
    <FsContext.Provider
      value={{ ...state, navigate, queueUpload, dismissUpload, deleteEntry, createFolder }}
    >
      {children}
    </FsContext.Provider>
  )
}

export function useFs(): FsContextValue {
  const ctx = useContext(FsContext)
  if (!ctx) throw new Error('useFs must be used within FsProvider')
  return ctx
}
