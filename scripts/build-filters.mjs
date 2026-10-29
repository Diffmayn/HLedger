// One-off asset pipeline: re-exports the legacy filter PNGs (from the old `main`
// branch: public/filters/<category>/*.png and Filters/*.png + *_annotations.csv)
// to WebP (max 1024 px) + 128 px thumbs, and writes public/filters/manifest.json.
//
//   node scripts/build-filters.mjs <legacy-root> [out=public/filters]
//
// <legacy-root> must contain `filters/` (sprite categories) and `Filters/` (masks).
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LEGACY = process.argv[2]
const OUT = process.argv[3] ?? path.resolve('public/filters')
if (!LEGACY) {
  console.error('usage: node scripts/build-filters.mjs <legacy-root> [out]')
  process.exit(1)
}

// LearnOpenCV selected keypoint indices: CSV label i -> MediaPipe landmark SEL[i]
const SEL = [127, 93, 58, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 288, 323, 356, 70, 63, 105, 66, 55,
  285, 296, 334, 293, 300, 168, 6, 195, 4, 64, 60, 94, 290, 439, 33, 160, 158, 173, 153, 144, 398, 385,
  387, 466, 373, 380, 61, 40, 39, 0, 269, 270, 291, 321, 405, 17, 181, 91, 78, 81, 13, 311, 306, 402, 14,
  178, 162, 54, 67, 10, 297, 284, 389]

// Sprite anchors: a MediaPipe landmark index plus an offset in face-local cm
// (x right, y up, z toward the camera). Width is the sprite's physical width in cm.
// Landmarks: 1 nose tip · 10 forehead top · 13 upper lip inner · 14 lower lip inner
// 152 chin · 164 philtrum · 168 between the eyes · 17 lower lip bottom.
const SPRITE_DEFAULTS = {
  hats: { anchor: { landmark: 10, offset: [0, 4.5, -2] }, width: 20 },
  glasses: { anchor: { landmark: 168, offset: [0, 0.3, 1.5] }, width: 14.5 },
  moustaches: { anchor: { landmark: 164, offset: [0, 0.2, 1] }, width: 7 },
  accessories: { anchor: { landmark: 1, offset: [0, -0.3, 0.8] }, width: 5 },
  faces: { anchor: { landmark: 168, offset: [0, -1.5, 1.5] }, width: 17 }
}
const SPRITE_OVERRIDES = {
  'dog-nose': { anchor: { landmark: 1, offset: [0, -0.3, 0.8] }, width: 5 },
  'cat-nose': { anchor: { landmark: 1, offset: [0, -0.3, 0.8] }, width: 4.5 },
  'dog-tongue': { anchor: { landmark: 14, offset: [0, -2.2, 0.5] }, width: 5, trigger: { blendshape: 'jawOpen', min: 0.45 } },
  'party-horn': { anchor: { landmark: 13, offset: [0, -0.6, 1.5] }, width: 9, trigger: { blendshape: 'jawOpen', min: 0.4 } },
  'bow-tie': { anchor: { landmark: 152, offset: [0, -5, -1] }, width: 12 },
  'flower-crown': { anchor: { landmark: 10, offset: [0, 2, -1.5] }, width: 19 },
  'flower-crown-hq': { anchor: { landmark: 10, offset: [0, 2, -1.5] }, width: 19 },
  'dog-ears': { anchor: { landmark: 10, offset: [0, 2.5, -3] }, width: 22 },
  'cat-ears': { anchor: { landmark: 10, offset: [0, 3, -3] }, width: 20 },
  'monkey-ears': { anchor: { landmark: 168, offset: [0, 1, -4] }, width: 24 },
  'crown': { anchor: { landmark: 10, offset: [0, 5, -2] }, width: 16 },
  'gold-crown': { anchor: { landmark: 10, offset: [0, 5, -2] }, width: 16 },
  'party-hat': { anchor: { landmark: 10, offset: [0, 7, -2] }, width: 14 },
  'birthday-hat': { anchor: { landmark: 10, offset: [0, 7, -2] }, width: 14 },
  'wizard-hat': { anchor: { landmark: 10, offset: [0, 8, -2] }, width: 16 },
  'top-hat': { anchor: { landmark: 10, offset: [0, 6, -2.5] }, width: 18 },
  'cowboy-hat': { anchor: { landmark: 10, offset: [0, 4, -2] }, width: 22 },
  'banana-hat': { anchor: { landmark: 10, offset: [0, 5, -2] }, width: 16 },
  'green-carnival': { anchor: { landmark: 10, offset: [0, 3, -1] }, width: 20 },
  'visor': { anchor: { landmark: 10, offset: [0, 2, 0] }, width: 20 },
  'beret': { anchor: { landmark: 10, offset: [0, 4, -2.5] }, width: 19 },
  'full-beard': { anchor: { landmark: 17, offset: [0, -1.5, 0.5] }, width: 14 },
  'goatee': { anchor: { landmark: 152, offset: [0, 1, 1] }, width: 6 },
  'stubble': { anchor: { landmark: 164, offset: [0, -2, 0.5] }, width: 13 }
}

const PRETTY = (id) => id.replace(/-hq$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

async function convert(src, outBase, maxPx) {
  const img = sharp(src, { animated: false })
  const meta = await img.metadata()
  await img.clone().resize({ width: Math.min(maxPx, meta.width), withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(`${outBase}.webp`)
  await sharp(src, { animated: false }).resize({ width: 128, height: 128, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 }).toFile(`${outBase}.thumb.webp`)
  const outMeta = await sharp(`${outBase}.webp`).metadata()
  return { width: outMeta.width, height: outMeta.height }
}

const manifest = []

// 1. Sprites from legacy public/filters/<category>/*.png|gif
const spriteRoot = path.join(LEGACY, 'filters')
for (const category of await fs.readdir(spriteRoot)) {
  const dir = path.join(spriteRoot, category)
  if (!(await fs.stat(dir)).isDirectory()) continue
  await fs.mkdir(path.join(OUT, category), { recursive: true })
  for (const file of (await fs.readdir(dir)).sort()) {
    if (!/\.(png|gif)$/i.test(file)) continue
    const id = file.replace(/\.(png|gif)$/i, '')
    if (id === 'flower-crown' && (await fs.readdir(dir)).includes('flower-crown-hq.png')) continue // keep hq only
    const outId = id.replace(/-hq$/, '')
    const { width, height } = await convert(path.join(dir, file), path.join(OUT, category, outId), 1024)
    const d = SPRITE_OVERRIDES[id] ?? SPRITE_OVERRIDES[outId] ?? SPRITE_DEFAULTS[category]
    manifest.push({
      id: outId, name: PRETTY(outId), category, type: 'sprite',
      src: `filters/${category}/${outId}.webp`, thumb: `filters/${category}/${outId}.thumb.webp`,
      width: d.width, aspect: +(height / width).toFixed(4), anchor: d.anchor, ...(d.trigger ? { trigger: d.trigger } : {})
    })
  }
}

// 2. Meshes from legacy Filters/<id>.png + <id>_annotations.csv (>= 20 points)
const meshRoot = path.join(LEGACY, 'Filters')
await fs.mkdir(path.join(OUT, 'masks'), { recursive: true })
for (const file of (await fs.readdir(meshRoot)).sort()) {
  if (!file.endsWith('_annotations.csv')) continue
  const id = file.replace('_annotations.csv', '')
  const rows = (await fs.readFile(path.join(meshRoot, file), 'utf8')).trim().split(/\r?\n/)
    .map(l => l.split(',')).filter(r => r.length >= 3 && !Number.isNaN(+r[1]))
  if (rows.length < 20) continue
  const png = path.join(meshRoot, `${id}.png`)
  const meta = await sharp(png).metadata()
  const { width, height } = await convert(png, path.join(OUT, 'masks', id), 1024)
  const points = rows.map(r => ({ landmark: SEL[+r[0]], u: +(+r[1] / meta.width).toFixed(5), v: +(+r[2] / meta.height).toFixed(5) }))
  await fs.writeFile(path.join(OUT, 'masks', `${id}.json`), JSON.stringify({ id, points }))
  manifest.push({
    id: `mask-${id}`, name: PRETTY(id), category: 'masks', type: 'mesh',
    src: `filters/masks/${id}.webp`, thumb: `filters/masks/${id}.thumb.webp`,
    points: `filters/masks/${id}.json`, aspect: +(height / width).toFixed(4),
    ...(rows.length < 60 ? { partial: true } : {})
  })
}

await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ version: 1, filters: manifest }, null, 2))
console.log(`${manifest.length} filters written to ${OUT}`)
