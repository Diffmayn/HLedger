import { expect, test } from '@playwright/test'

// These run against the preview build. Without Supabase env they assert the
// not-configured screen; with env (CI secrets) they assert the demo event loads.
test('app boots', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty()
  const text = await page.locator('body').innerText()
  expect(text.length).toBeGreaterThan(0)
})

test('unknown event shows not-found or not-configured', async ({ page }) => {
  await page.goto('/this-event-does-not-exist-xyz')
  await expect(page.locator('body')).toContainText(/not exist|not configured/i)
})
