// ProgressStore — the sync-ready boundary. Attempts are append-only;
// aggregates (accuracy, streak) are always derived. See docs/ARCHITECTURE.md.

export interface Attempt {
  id?: number // IDB autoincrement
  exerciseId: string
  date: string // YYYY-MM-DD local
  ts: number
  correct: boolean
  score: number
  detail?: unknown
}

export interface ExerciseStats {
  correct: number
  total: number
}

export interface Backup {
  version: 1
  exportedAt: number
  attempts: Attempt[]
  kv: Record<string, unknown>
}

export interface ProgressStore {
  recordAttempt(a: Attempt): Promise<void>
  getExerciseStats(exerciseId: string): Promise<ExerciseStats>
  getStreak(today: string): Promise<number>
  getSetting<T>(key: string, fallback: T): Promise<T>
  setSetting<T>(key: string, value: T): Promise<void>
  exportAll(): Promise<Backup>
  importAll(b: Backup): Promise<void>
}
