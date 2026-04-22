import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import type { FileEntry, UserInfo, UploadItem } from '@shared/types'

interface FsState {
  currentPath: string
  entries: FileEntry[]
  loading: boolean
  uploads: UploadItem[]
}

type FsAction =
  | { type: 'LOAD_START'; path: string }
  | { type: 'LOAD_DONE'; entries: FileEntry[] }
  | { type: 'UPLOAD_QUEUE'; item: UploadItem }
  | { type: 'UPLOAD_PROGRESS'; id: string; pct: number }
  | { type: 'UPLOAD_DONE'; id: string }
  | { type: 'UPLOAD_ERROR'; id: string; message: string }

function fsReducer(state: FsState, action: FsAction): FsState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, currentPath: action.path }
    case 'LOAD_DONE':
      return { ...state, loading: false, entries: action.entries }
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
    default:
      return state
  }
}

interface FsContextValue extends FsState {
  navigate(path: string): void
  queueUpload(localPath: string, filename: string): void
}

const FsContext = createContext<FsContextValue | null>(null)

const DEFAULT_PATH = 'Personal'

export function FsProvider({ children, user: _user }: { children: React.ReactNode; user: UserInfo }) {
  const [state, dispatch] = useReducer(fsReducer, {
    currentPath: DEFAULT_PATH,
    entries: [],
    loading: true,
    uploads: [],
  })

  const navigate = useCallback((path: string) => {
    dispatch({ type: 'LOAD_START', path })
    window.nels.fs.list(path)
      .then((entries) => dispatch({ type: 'LOAD_DONE', entries }))
      .catch(() => dispatch({ type: 'LOAD_DONE', entries: [] }))
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
    return () => {
      if (typeof offProgress === 'function') offProgress()
      if (typeof offDone === 'function') offDone()
      if (typeof offError === 'function') offError()
    }
  }, [])

  const queueUpload = useCallback((localPath: string, filename: string) => {
    const id = `${Date.now()}-${filename}`
    const remotePath = `${state.currentPath}/${filename}`
    const item: UploadItem = { id, localPath, remotePath, pct: 0, status: 'queued' }
    dispatch({ type: 'UPLOAD_QUEUE', item })
    window.nels.fs.upload(localPath, remotePath, id)
  }, [state.currentPath])

  return (
    <FsContext.Provider value={{ ...state, navigate, queueUpload }}>
      {children}
    </FsContext.Provider>
  )
}

export function useFs(): FsContextValue {
  const ctx = useContext(FsContext)
  if (!ctx) throw new Error('useFs must be used within FsProvider')
  return ctx
}
