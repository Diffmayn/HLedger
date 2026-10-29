import { describe, expect, it } from 'vitest'
import { OneEuroVector } from './oneEuro'

describe('OneEuroVector', () => {
  it('passes the first sample through and damps jitter', () => {
    const f = new OneEuroVector(1, 1, 0)
    expect(f.filter([10], 0)[0]).toBe(10)
    let out = 10
    for (let t = 16; t < 1000; t += 16) out = f.filter([10 + (t % 32 ? 0.5 : -0.5)], t)[0]!
    expect(Math.abs(out - 10)).toBeLessThan(0.4)
  })
  it('follows fast motion with little lag when beta is high', () => {
    const f = new OneEuroVector(1, 1, 1)
    f.filter([0], 0)
    let out = 0
    for (let t = 16; t <= 320; t += 16) out = f.filter([t], t)[0]!
    expect(out).toBeGreaterThan(280)
  })
})
