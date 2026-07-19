// Pure streak logic, ported from v0-vanilla src/storage.js.
// Dates are passed in as local-date strings (YYYY-MM-DD) — core never asks
// the clock. v0 used UTC date strings; the migration handles the switch.

export interface StreakState {
  streak: number
  lastPracticeDate: string | null
}

/** Local calendar date (YYYY-MM-DD) for a given moment — helper for the SHELL to call. */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return toLocalDateStr(d)
}

/** Streak after practicing on `today`. First practice of a day extends or resets. */
export function advanceStreak(state: StreakState, today: string): StreakState {
  if (state.lastPracticeDate === today) return state
  const continues = state.lastPracticeDate === dayBefore(today)
  return {
    streak: continues ? state.streak + 1 : 1,
    lastPracticeDate: today,
  }
}

/** Displayed streak: 0 unless the last practice was today or yesterday. */
export function effectiveStreak(state: StreakState, today: string): number {
  if (state.lastPracticeDate !== today && state.lastPracticeDate !== dayBefore(today)) {
    return 0
  }
  return state.streak
}
