import { expect, test } from '@playwright/test'

// Runs against the CI preview build with a local Supabase and the seeded `demo` event.
test.skip(!process.env.VITE_SUPABASE_URL, 'needs a Supabase instance')

const shots = 'e2e/screens'

test('guest posts a message and the wall shows it', async ({ page, browser }) => {
  await page.goto('/demo')
  await page.screenshot({ path: `${shots}/guest-1-name.png`, fullPage: true })
  await page.getByPlaceholder(/who is this from/i).fill('Playwright Guest')
  await page.getByRole('button', { name: /next/i }).click()
  await page.getByPlaceholder(/write something/i).fill('Hello from the CI robot 🎉')
  await page.screenshot({ path: `${shots}/guest-2-message.png`, fullPage: true })
  await page.getByRole('button', { name: /next/i }).click()
  await page.screenshot({ path: `${shots}/guest-3-media.png`, fullPage: true })
  await page.getByRole('button', { name: /send to the wall/i }).click()
  await expect(page.getByText(/on the wall/i)).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${shots}/guest-4-done.png`, fullPage: true })

  const wall = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await wall.goto('/demo/wall')
  await expect(wall.getByText('Playwright Guest')).toBeVisible({ timeout: 15_000 })
  await wall.screenshot({ path: `${shots}/wall-grid.png` })
  await wall.keyboard.press('s')
  await wall.waitForTimeout(800)
  await wall.screenshot({ path: `${shots}/wall-slideshow.png` })
  await wall.close()
})

test('guest posts a photo', async ({ page }) => {
  await page.goto('/demo')
  await page.getByPlaceholder(/who is this from/i).fill('Photo Guest')
  await page.getByRole('button', { name: /next/i }).click()
  await page.getByPlaceholder(/write something/i).fill('With a picture')
  await page.getByRole('button', { name: /next/i }).click()
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /choose from library/i }).click(),
  ])
  await chooser.setFiles('public/icons/icon-512.png')
  await expect(page.locator('img[alt=""]').first()).toBeVisible()
  await page.screenshot({ path: `${shots}/guest-photo-preview.png`, fullPage: true })
  await page.getByRole('button', { name: /send to the wall/i }).click()
  await expect(page.getByText(/on the wall/i)).toBeVisible({ timeout: 30_000 })
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

test('host screen asks for sign-in', async ({ page }) => {
  await page.goto('/demo/host')
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  await page.goto('/host')
  await page.screenshot({ path: `${shots}/host-signin.png`, fullPage: true })
})
