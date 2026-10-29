import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'

const faceClip = 'e2e/fixtures/face.y4m'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', testIgnore: /booth\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: /booth\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    {
      name: 'booth',
      testMatch: /booth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            ...(fs.existsSync(faceClip) ? [`--use-file-for-fake-video-capture=${faceClip}`] : []),
          ],
        },
        permissions: ['camera'],
      },
    },
  ],
})
