import { expect, test } from '@playwright/test'
import fs from 'node:fs'

// Runs in the `booth` Playwright project (fake camera flags). Needs a Supabase instance with the `demo` event.
test.skip(!process.env.VITE_SUPABASE_URL, 'needs a Supabase instance')

const shots = 'e2e/screens'

test.beforeEach(({ page }, info) => {
  const log = (line: string) => fs.appendFileSync(`${shots}/console.txt`, `[${info.title}] ${line}\n`)
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && log(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => log(`pageerror: ${e.message}`))
})

test('booth renders camera, filters and takes a photo', async ({ page }) => {
  await page.goto('/demo/booth')
  await expect(page.getByRole('button', { name: /tap to start/i })).toBeEnabled({ timeout: 30_000 })
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${shots}/booth-live.png` })
  await page.getByRole('option', { name: /top hat/i }).click()
  await page.getByRole('button', { name: /tap to start/i }).click()
  await expect(page.getByRole('button', { name: /send to the wall/i })).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${shots}/booth-review.png` })
  await page.getByPlaceholder(/your name/i).fill('Booth Guest')
  await page.getByRole('button', { name: /send to the wall/i }).click()
  await expect(page.getByText(/sent!/i)).toBeVisible({ timeout: 30_000 })
})


test('booth detects a face and applies a sprite', async ({ page }) => {
  test.skip(!fs.existsSync('e2e/fixtures/face.y4m'), 'needs e2e/fixtures/face.y4m')
  await page.goto('/demo/booth')
  await expect(page.getByRole('button', { name: /tap to start/i })).toBeEnabled({ timeout: 20_000 })
  await page.getByRole('option', { name: /top hat/i }).click()
  await expect(page.getByText(/step into the frame/i)).toBeHidden({ timeout: 10_000 })
  await page.screenshot({ path: `${shots}/booth-face.png` })
})
