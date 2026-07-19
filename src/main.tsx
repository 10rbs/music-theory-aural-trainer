import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import { routeTree } from './routeTree.gen'
import { IdbProgressStore } from './shell/storage/idb-store'
import { migrateV0 } from './shell/storage/migrate-v0'
import { StoreProvider } from './features/stats/store-context'

// BASE_URL comes from `base` in vite.config.ts — single source of truth.
const router = createRouter({ routeTree, basepath: import.meta.env.BASE_URL })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// One-time v0 localStorage import must finish before the store is first read,
// or a pre-migration streak of 0 could flash (or worse, race the write).
await migrateV0()

const store = new IdbProgressStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <RouterProvider router={router} />
    </StoreProvider>
  </StrictMode>,
)
