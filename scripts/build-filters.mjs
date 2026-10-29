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
// (x right, y up, z toward the camera). Width is the sprite's physical width in cm;
// `h` is its height in cm (width × aspect) so offsets can place the content edge.
// Landmarks: 1 nose tip · 10 forehead top · 13 upper lip inner · 14 lower lip inner
// 17 lower lip bottom · 152 chin · 164 philtrum · 168 between the eyes.
const CATEGORY_RULES = {
  hats: (h) => ({ width: 20, anchor: { landmark: 10, offset: [0, h * 0.4, -2] } }),
  glasses: () => ({ width: 14.5, anchor: { landmark: 168, offset: [0, -0.3, 1.5] } }),
  moustaches: () => ({ width: 7, anchor: { landmark: 164, offset: [0, 0, 1] } }),
  accessories: () => ({ width: 5, anchor: { landmark: 1, offset: [0, -0.4, 0.8] } }),
  faces: (h) => ({ width: 16, anchor: { landmark: 168, offset: [0, -(h * 0.15), 1.5] } }),
}
const ID_RULES = {
  'dog-nose': () => ({ width: 5, anchor: { landmark: 1, offset: [0, -0.4, 0.8] } }),
  'cat-nose': () => ({ width: 4.5, anchor: { landmark: 1, offset: [0, -0.4, 0.8] } }),
  'dog-tongue': (h) => ({ width: 5, anchor: { landmark: 14, offset: [0, -(h * 0.5), 0.5] }, trigger: { blendshape: 'jawOpen', min: 0.45 } }),
  'party-horn': () => ({ width: 9, anchor: { landmark: 13, offset: [0, -0.5, 1.5] }, trigger: { blendshape: 'jawOpen', min: 0.4 } }),
  'bow-tie': () => ({ width: 12, anchor: { landmark: 152, offset: [0, -5.5, -1] } }),
  'flower-crown': () => ({ width: 19, anchor: { landmark: 10, offset: [0, 2, -1.5] } }),
  'dog-ears': (h) => ({ width: 22, anchor: { landmark: 10, offset: [0, h * 0.25, -3] } }),
  'cat-ears': (h) => ({ width: 20, anchor: { landmark: 10, offset: [0, h * 0.45, -3] } }),
  'monkey-ears': () => ({ width: 24, anchor: { landmark: 168, offset: [0, 0, -4] } }),
  'crown': (h) => ({ width: 16, anchor: { landmark: 10, offset: [0, h * 0.45, -2] } }),
  'gold-crown': (h) => ({ width: 16, anchor: { landmark: 10, offset: [0, h * 0.45, -2] } }),
  'party-hat': (h) => ({ width: 13, anchor: { landmark: 10, offset: [0, h * 0.45, -2] } }),
  'birthday-hat': (h) => ({ width: 13, anchor: { landmark: 10, offset: [0, h * 0.45, -2] } }),
  'wizard-hat': (h) => ({ width: 18, anchor: { landmark: 10, offset: [0, h * 0.42, -2] } }),
  'top-hat': (h) => ({ width: 18, anchor: { landmark: 10, offset: [0, h * 0.42, -2.5] } }),
  'cowboy-hat': (h) => ({ width: 24, anchor: { landmark: 10, offset: [0, h * 0.35, -2] } }),
  'banana-hat': (h) => ({ width: 16, anchor: { landmark: 10, offset: [0, h * 0.4, -2] } }),
  'green-carnival': () => ({ width: 18, anchor: { landmark: 168, offset: [0, 0, 1.5] } }),
  'visor': (h) => ({ width: 20, anchor: { landmark: 10, offset: [0, h * 0.2, 0] } }),
  'beret': (h) => ({ width: 19, anchor: { landmark: 10, offset: [0, h * 0.35, -2.5] } }),
  'full-beard': (h) => ({ width: 14, anchor: { landmark: 17, offset: [0, -(h * 0.35), 0.5] } }),
  'goatee': () => ({ width: 6, anchor: { landmark: 152, offset: [0, 0.5, 1] } }),
  'stubble': () => ({ width: 13, anchor: { landmark: 164, offset: [0, -2.5, 0.5] } }),
}
const ruleFor = (id, category, aspect) => {
  const rule = ID_RULES[id] ?? CATEGORY_RULES[category] ?? CATEGORY_RULES.accessories
  const probe = rule(0)
  return rule(probe.width * aspect)
}

const PRETTY = (id) => id.replace(/-hq$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

/**
 * The legacy SVG→PNG export letterboxed every sprite with opaque black bars.
 * Clear any edge band that is 100% opaque black, then trim to the content box.
 */
async function cleanSprite(src) {
  const { data, info } = await sharp(src, { animated: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const isBlack = (x, y) => {
    const i = (y * w + x) * 4
    return data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 255
  }
  const rowBlack = (y) => { for (let x = 0; x < w; x++) if (!isBlack(x, y)) return false; return true }
  const colBlack = (x) => { for (let y = 0; y < h; y++) if (!isBlack(x, y)) return false; return true }
  const clearRow = (y) => { for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = 0 }
  const clearCol = (x) => { for (let y = 0; y < h; y++) data[(y * w + x) * 4 + 3] = 0 }
  for (let y = 0; y < h && rowBlack(y); y++) clearRow(y)
  for (let y = h - 1; y >= 0 && rowBlack(y); y--) clearRow(y)
  for (let x = 0; x < w && colBlack(x); x++) clearCol(x)
  for (let x = w - 1; x >= 0 && colBlack(x); x--) clearCol(x)
  // Trim fully transparent margins, keep a 2% pad so bilinear edges stay clean.
  let top = h, bottom = -1, left = w, right = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) {
    if (y < top) top = y; if (y > bottom) bottom = y; if (x < left) left = x; if (x > right) right = x
  }
  if (bottom < 0) return sharp(data, { raw: { width: w, height: h, channels: 4 } })
  const pad = Math.round(Math.max(w, h) * 0.02)
  left = Math.max(0, left - pad); top = Math.max(0, top - pad)
  right = Math.min(w - 1, right + pad); bottom = Math.min(h - 1, bottom + pad)
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
}

async function convert(src, outBase, maxPx, clean = true) {
  const base = clean ? await cleanSprite(src) : sharp(src, { animated: false })
  const buf = await base.png().toBuffer()
  const meta = await sharp(buf).metadata()
  await sharp(buf).resize({ width: Math.min(maxPx, meta.width), height: Math.min(maxPx, meta.height), fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(`${outBase}.webp`)
  await sharp(buf).resize({ width: 128, height: 128, fit: 'inside', withoutEnlargement: true })
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
    const aspect = +(height / width).toFixed(4)
    const d = ruleFor(outId, category, aspect)
    manifest.push({
      id: outId, name: PRETTY(outId), category, type: 'sprite',
      src: `filters/${category}/${outId}.webp`, thumb: `filters/${category}/${outId}.thumb.webp`,
      width: d.width, aspect, anchor: { landmark: d.anchor.landmark, offset: d.anchor.offset.map((v) => +v.toFixed(2)) },
      ...(d.trigger ? { trigger: d.trigger } : {})
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
  const { width, height } = await convert(png, path.join(OUT, 'masks', id), 1024, false)
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
