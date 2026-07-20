import { describe, expect, test } from 'vitest'
import { staffLayout } from './staff'

const note = (letter: string, alter: number, midi: number) => ({ letter, alter, midi })

describe('staffLayout', () => {
  test('staff positions relative to E4 = 0', () => {
    const [e4, f4, c5, f5] = staffLayout([
      note('E', 0, 64),
      note('F', 0, 65),
      note('C', 0, 72),
      note('F', 0, 77),
    ])
    expect(e4.step).toBe(0)
    expect(f4.step).toBe(1)
    expect(c5.step).toBe(5)
    expect(f5.step).toBe(8) // top line
  })

  test('written octave follows the letter, not the sounding pitch', () => {
    // B♯3 sounds C4 (60) but is written on the B3 position
    expect(staffLayout([note('B', 1, 60)])[0].step).toBe(-3)
    // C♭4 sounds B3 (59) but is written on the C4 position
    expect(staffLayout([note('C', -1, 59)])[0].step).toBe(-2)
    // F♯4 stays on the F4 position
    expect(staffLayout([note('F', 1, 66)])[0].step).toBe(1)
  })

  test('ledger lines below the staff', () => {
    const [g3, a3, b3, c4, d4] = staffLayout([
      note('G', 0, 55),
      note('A', 0, 57),
      note('B', 0, 59),
      note('C', 0, 60),
      note('D', 0, 62),
    ])
    expect(g3.step).toBe(-5)
    expect(g3.ledgerSteps).toEqual([-2, -4])
    expect(a3.ledgerSteps).toEqual([-2, -4])
    expect(b3.ledgerSteps).toEqual([-2])
    expect(c4.ledgerSteps).toEqual([-2])
    expect(d4.ledgerSteps).toEqual([]) // hangs just below the staff
  })

  test('ledger lines above the staff', () => {
    const [g5, a5, c6] = staffLayout([note('G', 0, 79), note('A', 0, 81), note('C', 0, 84)])
    expect(g5.ledgerSteps).toEqual([]) // sits just above the top line
    expect(a5.ledgerSteps).toEqual([10])
    expect(c6.ledgerSteps).toEqual([10, 12])
  })

  test('no ledger lines for notes on the staff', () => {
    for (const n of staffLayout([note('E', 0, 64), note('B', 0, 71), note('F', 0, 77)])) {
      expect(n.ledgerSteps).toEqual([])
    }
  })

  test('alter passes through for accidental rendering', () => {
    const [sharp, doubleSharp] = staffLayout([note('F', 1, 66), note('F', 2, 67)])
    expect(sharp.alter).toBe(1)
    expect(doubleSharp.alter).toBe(2)
  })

  test('bass clef positions relative to G2 = 0', () => {
    const [g2, f3, a3, c4] = staffLayout(
      [note('G', 0, 43), note('F', 0, 53), note('A', 0, 57), note('C', 0, 60)],
      'bass',
    )
    expect(g2.step).toBe(0) // bottom line
    expect(f3.step).toBe(6) // F line (the clef's line)
    expect(a3.step).toBe(8) // top line
    expect(c4.step).toBe(10) // middle C: one ledger above
    expect(c4.ledgerSteps).toEqual([10])
  })

  test('alto and tenor clefs put middle C on their C-clef line', () => {
    const [altoC4] = staffLayout([note('C', 0, 60)], 'alto')
    expect(altoC4.step).toBe(4) // middle line
    const [tenorC4] = staffLayout([note('C', 0, 60)], 'tenor')
    expect(tenorC4.step).toBe(6) // 4th line
  })
})
