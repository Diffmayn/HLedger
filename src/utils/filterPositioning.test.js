import { describe, expect, it } from 'vitest'
import { getAccessoryPosition } from './filterPositioning'

function buildLandmarks() {
  const landmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  landmarks[10] = { x: 0.5, y: 0.22, z: 0 }
  landmarks[152] = { x: 0.5, y: 0.8, z: 0 }
  landmarks[234] = { x: 0.32, y: 0.52, z: 0 }
  landmarks[454] = { x: 0.68, y: 0.52, z: 0 }
  landmarks[33] = { x: 0.4, y: 0.42, z: 0 }
  landmarks[263] = { x: 0.6, y: 0.41, z: 0 }
  landmarks[61] = { x: 0.42, y: 0.62, z: 0 }
  landmarks[291] = { x: 0.58, y: 0.63, z: 0 }
  landmarks[164] = { x: 0.5, y: 0.56, z: 0 }
  landmarks[0] = { x: 0.5, y: 0.61, z: 0 }
  landmarks[168] = { x: 0.5, y: 0.38, z: 0 }
  return landmarks
}

describe('filterPositioning', () => {
  it('places body accessories below the chin', () => {
    const landmarks = buildLandmarks()
    const position = getAccessoryPosition(landmarks, 1000, 1000, { type: 'body' })

    expect(position).toBeTruthy()
    expect(position?.y).toBeGreaterThan(700)
  })

  it('applies filter fit and user scale adjustments', () => {
    const landmarks = buildLandmarks()
    const base = getAccessoryPosition(landmarks, 1000, 1000, 'hat')
    const adjusted = getAccessoryPosition(landmarks, 1000, 1000, {
      type: 'hat',
      fitScale: 0.85,
      userScale: 1.2,
      offsetYRatio: -0.1,
    })

    expect(base).toBeTruthy()
    expect(adjusted).toBeTruthy()
    expect(adjusted?.width).toBeCloseTo(base.width * 1.02, 0)
    expect(adjusted?.y).toBeLessThan(base.y)
  })
})