// Single ProgressStore instance for the app, via context so component tests
// can inject a fake.

import { createContext, useContext, type ReactNode } from 'react'
import type { ProgressStore } from '../../shell/storage/types'

const StoreContext = createContext<ProgressStore | null>(null)

/** Fired (event type 'attempt') after an attempt is recorded, so stats UIs can refresh. */
export const statsEvents = new EventTarget()

/** Fired (event type 'settings') after a global setting (clef, theme) changes. */
export const settingsEvents = new EventTarget()

export function StoreProvider({ store, children }: { store: ProgressStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): ProgressStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within a StoreProvider')
  return store
}
