import { expect, test } from '@playwright/test'

// Runs against the CI preview build with a local Supabase and the seeded `demo` event.
test.skip(!process.env.VITE_SUPABASE_URL, 'needs a Supabase instance')

const shots = 'e2e/screens'

import fs from 'node:fs'
test.beforeEach(({ page }, info) => {
  const log = (line: string) => fs.appendFileSync(`${shots}/console.txt`, `[${info.title}] ${line}\n`)
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && log(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => log(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => log(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`))
  page.on('response', (r) => r.status() >= 400 && log(`http ${r.status()}: ${r.url()}`))
})

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
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${shots}/guest-4-after-send.png`, fullPage: true })
  await expect(page.getByText(/on the wall/i)).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${shots}/guest-4-done.png`, fullPage: true })

  // Feed with reactions.
  await page.getByRole('link', { name: /see the wall/i }).click()
  await expect(page.getByText('Playwright Guest')).toBeVisible({ timeout: 15_000 })
  const heart = page.getByRole('button', { name: /^❤️/ }).first()
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(heart).toContainText('1', { timeout: 10_000 })
  await page.screenshot({ path: `${shots}/guest-5-feed.png`, fullPage: true })
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'false')

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

test('host screen asks for sign-in', async ({ page }) => {
  await page.goto('/demo/host')
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  await page.goto('/host')
  await page.screenshot({ path: `${shots}/host-signin.png`, fullPage: true })
})

test('host signs in, moderates, edits speech and sees links', async ({ page }) => {
  test.skip(!process.env.E2E_HOST_EMAIL, 'needs host credentials')
  await page.goto('/host')
  await page.getByRole('button', { name: /password instead/i }).click()
  await page.getByLabel(/email/i).fill(process.env.E2E_HOST_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.E2E_HOST_PASSWORD!)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page.getByText('Demo Guestbook')).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${shots}/host-home.png`, fullPage: true })
  await page.getByRole('link', { name: /open/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Demo Guestbook' })).toBeVisible({ timeout: 15_000 })

  // Moderation: published tab has the seeded entries; hide one and restore it.
  await page.getByRole('button', { name: /^published/i }).click()
  await page.screenshot({ path: `${shots}/host-moderation.png`, fullPage: true })
  const hide = page.getByRole('button', { name: /^hide$/i }).first()
  await hide.click()
  await page.getByRole('button', { name: /^hidden/i }).click()
  await expect(page.getByRole('button', { name: /restore/i }).first()).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /restore/i }).first().click()
  await expect(page.getByRole('button', { name: /restore/i })).toHaveCount(0, { timeout: 10_000 })

  // Delete the photo entry (row + Storage files).
  await page.getByRole('button', { name: /^published/i }).click()
  page.once('dialog', (d) => void d.accept())
  const photoCard = page.locator('li', { hasText: 'Photo Guest' })
  await photoCard.getByRole('button', { name: /delete/i }).click()
  await expect(page.locator('li', { hasText: 'Photo Guest' })).toHaveCount(0, { timeout: 10_000 })

  await page.getByRole('button', { name: /links/i }).click()
  await expect(page.getByAltText(/qr code/i).first()).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: `${shots}/host-links.png`, fullPage: true })

  await page.getByRole('button', { name: /settings/i }).click()
  await page.screenshot({ path: `${shots}/host-settings.png`, fullPage: true })

  await page.getByRole('button', { name: /speech/i }).click()
  await page.getByPlaceholder('Title').fill('A few words')
  await page.getByPlaceholder(/the speech/i).fill('Thank you all for coming.')
  await page.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: `${shots}/host-speech.png`, fullPage: true })

  await page.getByRole('button', { name: /export/i }).click()
  await page.screenshot({ path: `${shots}/host-export.png`, fullPage: true })
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: /download/i }).first().click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.csv$/)
})
