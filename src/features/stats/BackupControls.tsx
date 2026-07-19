import { useRef, useState } from 'react'
import type { Backup } from '../../shell/storage/types'
import { statsEvents, useStore } from './store-context'

export function BackupControls() {
  const store = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportBackup = async () => {
    const backup = await store.exportAll()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aural-trainer-backup-${backup.exportedAt}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Backup
      if (parsed.version !== 1 || !Array.isArray(parsed.attempts)) {
        setMessage('That file does not look like an Aural Trainer backup.')
        return
      }
      await store.importAll(parsed)
      statsEvents.dispatchEvent(new Event('attempt'))
      setMessage(`Imported ${parsed.attempts.length} attempts.`)
    } catch {
      setMessage('Import failed — the file could not be read.')
    }
  }

  return (
    <div className="backup-controls">
      <button className="link-btn" onClick={() => void exportBackup()}>
        Export backup
      </button>
      <button className="link-btn" onClick={() => fileRef.current?.click()}>
        Import backup
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importBackup(f)
          e.target.value = ''
        }}
      />
      {message && <span className="backup-message">{message}</span>}
    </div>
  )
}
