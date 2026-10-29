export type FilterCategory = 'hats' | 'glasses' | 'moustaches' | 'accessories' | 'faces' | 'masks'

export interface FilterTrigger {
  blendshape: string
  min: number
}

export interface SpriteFilter {
  id: string
  name: string
  category: FilterCategory
  type: 'sprite'
  src: string
  thumb: string
  /** Physical width in centimetres. */
  width: number
  /** height / width of the image. */
  aspect: number
  anchor: { landmark: number; offset: [number, number, number] }
  trigger?: FilterTrigger
}

export interface MeshFilter {
  id: string
  name: string
  category: 'masks'
  type: 'mesh'
  src: string
  thumb: string
  /** JSON with `{ points: [{ landmark, u, v }] }`, v measured top-down. */
  points: string
  aspect: number
  partial?: boolean
}

export type FilterDef = SpriteFilter | MeshFilter

export interface FilterManifest {
  version: number
  filters: FilterDef[]
}

export interface MeshPoints {
  id: string
  points: { landmark: number; u: number; v: number }[]
}

export const CATEGORY_ORDER: FilterCategory[] = [
  'hats',
  'glasses',
  'moustaches',
  'accessories',
  'masks',
  'faces',
]

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

let manifestPromise: Promise<FilterManifest> | null = null

export function loadManifest(): Promise<FilterManifest> {
  manifestPromise ??= fetch(assetUrl('filters/manifest.json')).then(async (r) => {
    if (!r.ok) throw new Error(`Could not load filter manifest (${r.status})`)
    const json = (await r.json()) as FilterManifest
    return json
  })
  return manifestPromise
}

const meshPointsCache = new Map<string, Promise<MeshPoints>>()

export function loadMeshPoints(def: MeshFilter): Promise<MeshPoints> {
  let p = meshPointsCache.get(def.id)
  if (!p) {
    p = fetch(assetUrl(def.points)).then(async (r) => {
      if (!r.ok) throw new Error(`Could not load mesh points for ${def.id}`)
      return (await r.json()) as MeshPoints
    })
    meshPointsCache.set(def.id, p)
  }
  return p
}

/** Which filters can be worn together: at most one per slot. */
export function slotOf(def: FilterDef): 'head' | 'eyes' | 'mouth' | 'nose' | 'face' | 'neck' {
  if (def.type === 'mesh') return 'face'
  switch (def.category) {
    case 'hats':
      return 'head'
    case 'glasses':
      return 'eyes'
    case 'moustaches':
      return 'mouth'
    case 'faces':
      return 'face'
    case 'accessories':
      if (def.id === 'bow-tie') return 'neck'
      if (def.id === 'flower-crown') return 'head'
      if (def.id === 'dog-tongue' || def.id === 'party-horn') return 'mouth'
      return 'nose'
    default:
      return 'face'
  }
}
