import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = process.cwd()

const filterDataPath = path.join(root, 'src', 'components', 'FaceFilter', 'filterData.js')
const mod = await import(pathToFileURL(filterDataPath).href + `?v=${Date.now()}`)
const filters = mod.FILTERS || []

let generated = 0
for (const f of filters) {
  if (!f?.src || typeof f.src !== 'string') continue
  if (!f.src.startsWith('data:image/svg+xml,')) continue

  const svg = decodeURIComponent(f.src.replace('data:image/svg+xml,', ''))
  const m = svg.match(/viewBox="0\s+0\s+([0-9.]+)\s+([0-9.]+)"/)
  const baseW = m ? Number(m[1]) : 512
  const baseH = m ? Number(m[2]) : 512
  const outW = Math.max(1024, Math.round(baseW * 2))
  const outH = Math.max(1024, Math.round(baseH * 2))

  const outDir = path.join(root, 'public', 'filters', f.category || 'misc')
  await fs.mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, `${f.id}.png`)

  await sharp(Buffer.from(svg), { density: 1200 })
    .resize(outW, outH, { fit: 'contain', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(outFile)

  generated++
}

console.log(`Generated ${generated} high-res PNG filter assets.`)
