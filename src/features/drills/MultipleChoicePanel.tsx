import { useState } from 'react'
import type { GradeResult, MultipleChoicePrompt } from '../../core/exercises/types'

export function MultipleChoicePanel({
  prompt,
  answerKey,
  result,
  onAnswer,
}: {
  prompt: MultipleChoicePrompt
  answerKey: string
  result: GradeResult | null
  onAnswer: (id: string) => void
}) {
  const [picked, setPicked] = useState<string | null>(null)

  const pick = (id: string) => {
    if (result) return
    setPicked(id)
    onAnswer(id)
  }

  return (
    <div className="choices">
      {prompt.choices.map((c) => {
        let cls = 'choice-btn'
        if (result) {
          if (c.id === answerKey) cls += ' correct'
          else if (c.id === picked) cls += ' incorrect'
        }
        return (
          <button key={c.id} className={cls} disabled={!!result} onClick={() => pick(c.id)}>
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
