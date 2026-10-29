import { expect, test } from '@playwright/test'
import fs from 'node:fs'

// Requires e2e/fixtures/face.y4m (a short clip with a face) and Supabase env with a `demo` event.
test.skip(!fs.existsSync('e2e/fixtures/face.y4m') || !process.env.VITE_SUPABASE_URL, 'needs fixture + env')

test('booth detects a face and applies a sprite', async ({ page }) => {
  await page.goto('/demo/booth')
  await expect(page.getByRole('button', { name: /tap to start/i })).toBeEnabled({ timeout: 20_000 })
  await page.getByRole('option', { name: /top hat/i }).click()
  await expect(page.getByText(/step into the frame/i)).toBeHidden({ timeout: 10_000 })
  const fps = await page.locator('text=/\\d+ fps/').textContent()
  expect(Number.parseInt(fps ?? '0', 10)).toBeGreaterThan(10)
})
