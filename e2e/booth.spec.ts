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


test('booth detects a face and places filters', async ({ page }) => {
  test.setTimeout(240_000)
  test.skip(!fs.existsSync('e2e/fixtures/face.y4m'), 'needs e2e/fixtures/face.y4m')
  await page.goto('/demo/booth')
  await expect(page.getByRole('button', { name: /tap to start/i })).toBeEnabled({ timeout: 20_000 })
  await expect(page.getByText(/loading face filters/i)).toBeHidden({ timeout: 60_000 })
  const tries: { category: string; option: RegExp; name: string }[] = [
    { category: 'Hats', option: /^top hat$/i, name: 'top-hat' },
    { category: 'Glasses', option: /^aviator$/i, name: 'aviator' },
    { category: 'Moustaches', option: /^handlebar$/i, name: 'handlebar' },
    { category: 'Accessories', option: /^dog nose$/i, name: 'dog-nose' },
    { category: 'Masks', option: /^anonymous$/i, name: 'mask-anonymous' },
    { category: 'Faces', option: /squid guard/i, name: 'squid-guard' },
  ]
  for (const t of tries) {
    await page.getByRole('button', { name: /^no filter$/i }).click()
    await page.getByRole('button', { name: new RegExp(`^${t.category}$`, 'i') }).click()
    await page.getByRole('option', { name: t.option }).click()
    await page.waitForTimeout(1200)
    await expect(page.getByText(/step into the frame/i)).toBeHidden()
    await page.screenshot({ path: `${shots}/booth-face-${t.name}.png` })
  }
  // All slots at once.
  await page.getByRole('button', { name: /^no filter$/i }).click()
  for (const t of tries.slice(0, 4)) {
    await page.getByRole('button', { name: new RegExp(`^${t.category}$`, 'i') }).click()
    await page.getByRole('option', { name: t.option }).click()
  }
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${shots}/booth-face-combo.png` })
  const fps = await page.locator('text=/\\d+ fps/').textContent().catch(() => null)
  if (fps) fs.appendFileSync(`${shots}/console.txt`, `fps: ${fps}\n`)
})
