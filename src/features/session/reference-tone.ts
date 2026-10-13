// The saved reference tone (setting `referenceTone`, kv store — rides along
// in backups). Read through parseReferenceTone so a malformed or hand-edited
// backup reads as "no reference" instead of breaking the report.

import { useEffect, useState } from 'react'
import { parseReferenceTone, type ReferenceTone, type Tone } from '../../core/pitch/timbre'
import { toLocalDateStr } from '../../core/streak'
import { useStore } from '../stats/store-context'

const KEY = 'referenceTone'

export function useReferenceTone() {
  const store = useStore()
  const [reference, setReference] = useState<ReferenceTone | null>(null)

  // Loaded on mount; backup import happens on /exercises, so returning to
  // the session screen re-reads it.
  useEffect(() => {
    let cancelled = false
    void store.getSetting<unknown>(KEY, null).then((x) => {
      if (!cancelled) setReference(parseReferenceTone(x))
    })
    return () => {
      cancelled = true
    }
  }, [store])

  const save = (tone: Tone, midi: number) => {
    const ref: ReferenceTone = { ...tone, midi, savedOn: toLocalDateStr(new Date()) }
    setReference(ref)
    void store.setSetting(KEY, ref)
  }

  const clear = () => {
    setReference(null)
    void store.setSetting(KEY, null)
  }

  return { reference, save, clear }
}
