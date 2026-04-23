// Shared parsing for NeLS SFTP paths in the renderer.
//
// The invariant: the first segment of any user-visible path is either
// `Personal` or `Projects/<name>`. Paths at `$HOME` itself aren't shown
// — writes there aren't managed by the NeLS web UI. The same invariant
// backs delete/mkdir safety in the main process (see
// `src/main/ipc.ts#assertSafeWritePath`), but that check runs on a raw
// string and stays intentionally decoupled from this renderer helper.

export type PathRootKind = 'home' | 'project'

export interface PathRoot {
  kind: PathRootKind
  /** Human-readable label: `Personal` or the project name. */
  label: string
  /** Canonical root path: `Personal` or `Projects/<name>`. */
  path: string
}

export interface PathSegment {
  label: string
  path: string
}

export interface ParsedPath {
  root: PathRoot
  segments: PathSegment[]
}

/**
 * Split a NeLS SFTP path into its root (Personal vs a specific project)
 * and the segments nested under that root.
 *
 * Examples:
 *   ''                         → { root: Personal, segments: [] }
 *   'Personal'                 → { root: Personal, segments: [] }
 *   'Personal/foo/bar'         → { root: Personal, segments: [foo, foo/bar] }
 *   'Projects/acme'            → { root: project(acme), segments: [] }
 *   'Projects/acme/reads/x'    → { root: project(acme), segments: [reads, reads/x] }
 */
export function parsePath(currentPath: string): ParsedPath {
  const parts = currentPath.split('/').filter(Boolean)
  if (parts[0] === 'Projects' && parts[1]) {
    const projectName = parts[1]
    const rest = parts.slice(2)
    return {
      root: {
        kind: 'project',
        label: projectName,
        path: `Projects/${projectName}`,
      },
      segments: rest.map((label, i) => ({
        label,
        path: ['Projects', projectName, ...rest.slice(0, i + 1)].join('/'),
      })),
    }
  }
  // Everything else (Personal, Personal/foo, ...) is rooted in Personal.
  const rest = parts[0] === 'Personal' ? parts.slice(1) : parts
  return {
    root: {
      kind: 'home',
      label: 'Personal',
      path: 'Personal',
    },
    segments: rest.map((label, i) => ({
      label,
      path: ['Personal', ...rest.slice(0, i + 1)].join('/'),
    })),
  }
}

/**
 * Returns the project name if `path` is rooted under `Projects/<name>/...`,
 * otherwise null. Used by the sidebar to highlight the active project.
 */
export function getProjectName(path: string): string | null {
  const parts = path.split('/').filter(Boolean)
  if (parts[0] !== 'Projects' || !parts[1]) return null
  return parts[1]
}
