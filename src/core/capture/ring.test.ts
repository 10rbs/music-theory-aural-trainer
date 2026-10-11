import { describe, expect, test } from 'vitest'
import { createRing, readRing, ringStart, writeRing } from './ring'

const seq = (from: number, n: number) => Float32Array.from({ length: n }, (_, i) => from + i)

describe('ring buffer', () => {
  test('reads back what was written before it fills', () => {
    const r = createRing(10)
    writeRing(r, seq(0, 4))
    writeRing(r, seq(4, 3))
    expect(Array.from(readRing(r, 0, 7))).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(ringStart(r)).toBe(0)
  })

  test('keeps only the newest samples once it wraps, in order', () => {
    const r = createRing(10)
    for (let i = 0; i < 5; i++) writeRing(r, seq(i * 4, 4)) // 0..19
    expect(r.written).toBe(20)
    expect(ringStart(r)).toBe(10)
    expect(Array.from(readRing(r, 0, 20))).toEqual(Array.from(seq(10, 10)))
  })

  test('reads an arbitrary absolute window across the wrap point', () => {
    const r = createRing(8)
    writeRing(r, seq(0, 13)) // holds 5..12
    expect(Array.from(readRing(r, 7, 11))).toEqual([7, 8, 9, 10])
  })

  test('a chunk bigger than the ring keeps its tail', () => {
    const r = createRing(4)
    writeRing(r, seq(0, 10))
    expect(r.written).toBe(10)
    expect(Array.from(readRing(r, 0, 10))).toEqual([6, 7, 8, 9])
  })

  test('empty or out-of-range reads return nothing', () => {
    const r = createRing(4)
    expect(readRing(r, 0, 4)).toHaveLength(0)
    writeRing(r, seq(0, 2))
    expect(readRing(r, 5, 9)).toHaveLength(0)
  })
})
