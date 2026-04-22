import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { NelsProject } from '@shared/types'

type ProjectsState =
  | { status: 'loading'; projects: NelsProject[] }
  | { status: 'ready'; projects: NelsProject[] }
  | { status: 'error'; projects: NelsProject[]; error: string }

interface ProjectsContextValue {
  state: ProjectsState
  refresh(): void
  /** Names of projects the user has filesystem access to — used to detect project paths. */
  projectNames: Set<string>
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProjectsState>({ status: 'loading', projects: [] })

  const refresh = useCallback(() => {
    setState((prev) => ({ status: 'loading', projects: prev.projects }))
    window.nels.projects.list()
      .then((projects) => setState({ status: 'ready', projects }))
      .catch((err: Error) => setState((prev) => ({ status: 'error', projects: prev.projects, error: err.message })))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const projectNames = new Set(state.projects.map((p) => p.name))

  return (
    <ProjectsContext.Provider value={{ state, refresh, projectNames }}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider')
  return ctx
}
