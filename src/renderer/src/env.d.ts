import type { WorklineApi } from '@shared/types'

declare global {
  interface Window {
    api: WorklineApi
  }
}

export {}
