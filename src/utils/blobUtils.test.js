import { describe, expect, it } from 'vitest'
import { blobToDataUrl, dataUrlToBlob } from './blobUtils'

describe('dataUrlToBlob', () => {
  it('throws for invalid input', () => {
    expect(() => dataUrlToBlob('')).toThrow('Invalid data URL.')
  })

  it('creates a blob from a valid data URL', async () => {
    const original = new Blob(['hello world'], { type: 'text/plain' })
    const dataUrl = await blobToDataUrl(original)
    const converted = dataUrlToBlob(dataUrl)

    expect(converted).toBeInstanceOf(Blob)
    expect(converted.type).toBe('text/plain')
    await expect(converted.text()).resolves.toBe('hello world')
  })
})

describe('blobToDataUrl', () => {
  it('rejects when the input is not a blob', async () => {
    await expect(blobToDataUrl('nope')).rejects.toThrow('Expected a Blob.')
  })
})