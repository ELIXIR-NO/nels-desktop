/// <reference types="vite/client" />
import type { NeLS } from '@shared/types'

declare global {
  interface Window {
    nels: NeLS
  }
}
