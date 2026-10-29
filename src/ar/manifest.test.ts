import { describe, expect, it } from 'vitest'
import manifest from '../../public/filters/manifest.json'
import { slotOf, type FilterDef } from './manifest'

describe('filter manifest', () => {
  const filters = manifest.filters as FilterDef[]
  it('has unique ids and complete sprite anchors', () => {
    const ids = new Set(filters.map((f) => f.id))
    expect(ids.size).toBe(filters.length)
    for (const f of filters) {
      if (f.type === 'sprite') {
        expect(f.width).toBeGreaterThan(0)
        expect(f.anchor.offset).toHaveLength(3)
        expect(f.anchor.landmark).toBeGreaterThanOrEqual(0)
      } else {
        expect(f.points).toMatch(/\.json$/)
      }
      expect(slotOf(f)).toBeTruthy()
    }
  })
  it('includes the four mesh masks', () => {
    expect(filters.filter((f) => f.type === 'mesh').map((f) => f.id).sort()).toEqual([
      'mask-anime',
      'mask-anonymous',
      'mask-green-carnival',
      'mask-jason-joker',
    ])
  })
})
