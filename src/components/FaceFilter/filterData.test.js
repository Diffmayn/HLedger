import { describe, expect, it } from 'vitest'
import { FILTERS } from './filterData'

const supportedTypes = new Set(['hat', 'glasses', 'moustache', 'nose', 'mouth', 'face', 'body'])
const supportedCategories = new Set(['hats', 'accessories', 'glasses', 'moustaches', 'faces'])

describe('FILTERS', () => {
  it('only uses supported categories and overlay types', () => {
    FILTERS.forEach((filter) => {
      expect(supportedCategories.has(filter.category)).toBe(true)
      expect(supportedTypes.has(filter.type)).toBe(true)
      expect(filter.src.startsWith('/filters/')).toBe(true)
    })
  })

  it('maps bow ties onto the new body anchor', () => {
    const bowTie = FILTERS.find((filter) => filter.id === 'bow-tie')
    expect(bowTie).toBeTruthy()
    expect(bowTie?.type).toBe('body')
    expect(bowTie?.category).toBe('accessories')
  })

  it('includes the newly surfaced filter categories', () => {
    expect(FILTERS.some((filter) => filter.category === 'glasses')).toBe(true)
    expect(FILTERS.some((filter) => filter.category === 'moustaches')).toBe(true)
  })
})