import * as THREE from 'three'
import Delaunator from 'delaunator'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { OneEuroVector } from './oneEuro'
import { assetUrl, loadMeshPoints, slotOf, type FilterDef, type MeshFilter, type SpriteFilter } from './manifest'

/**
 * MediaPipe's face geometry pipeline estimates the transformation matrix for a
 * pinhole camera with a 63° vertical field of view; using the same camera here is
 * what makes centimetre-sized sprites land on the face at the right size.
 */
export const FACE_FOV_DEG = 63
const VIDEO_DEPTH = 2000 // cm; far enough that the video plane never clips overlays
const LANDMARK_COUNT = 478
const LOST_FACE_HOLD_MS = 150

const RENDER_ORDER: Record<ReturnType<typeof slotOf>, number> = {
  face: 1,
  neck: 2,
  mouth: 3,
  nose: 4,
  eyes: 5,
  head: 6,
}

type Blendshapes = Map<string, number>

interface SpriteOverlay {
  kind: 'sprite'
  def: SpriteFilter
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
}

interface MeshOverlay {
  kind: 'mesh'
  def: MeshFilter
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
  landmarks: Uint16Array
  positions: Float32Array
}

type Overlay = SpriteOverlay | MeshOverlay

class FaceTrack {
  readonly group = new THREE.Group()
  readonly overlays: Overlay[] = []
  readonly quat = new THREE.Quaternion()
  depth = -50
  lastSeen = 0
  readonly lm = new Float32Array(LANDMARK_COUNT * 2)
  private readonly lmFilter = new OneEuroVector(LANDMARK_COUNT * 2, 1.2, 0.015)
  private readonly quatFilter = new OneEuroVector(4, 1.0, 0.01)
  private readonly depthFilter = new OneEuroVector(1, 0.8, 0.005)
  blendshapes: Blendshapes = new Map()

  update(
    landmarks: { x: number; y: number }[],
    matrixData: number[] | Float32Array | undefined,
    blendshapes: Blendshapes,
    t: number,
  ) {
    const raw = this.lm
    for (let i = 0; i < LANDMARK_COUNT; i++) {
      const p = landmarks[i]
      raw[i * 2] = p?.x ?? 0
      raw[i * 2 + 1] = p?.y ?? 0
    }
    this.lm.set(this.lmFilter.filter(raw, t))

    if (matrixData && matrixData.length === 16) {
      const m = matrixFromMediaPipe(matrixData)
      const q = new THREE.Quaternion().setFromRotationMatrix(m)
      const qf = this.quatFilter.filter([q.x, q.y, q.z, q.w], t)
      this.quat.set(qf[0] ?? 0, qf[1] ?? 0, qf[2] ?? 0, qf[3] ?? 1).normalize()
      const z = m.elements[14] ?? -50
      this.depth = this.depthFilter.filter([Math.min(-10, z)], t)[0] ?? -50
    }
    this.blendshapes = blendshapes
    this.lastSeen = t
    this.group.visible = true
  }

  reset() {
    this.lmFilter.reset()
    this.quatFilter.reset()
    this.depthFilter.reset()
  }
}

const tmpMatrix = new THREE.Matrix4()
function matrixFromMediaPipe(data: number[] | Float32Array): THREE.Matrix4 {
  // Column-major keeps translation at 12..14; row-major keeps it at 3,7,11 with 12..14 ≈ 0.
  const columnMajor = Math.abs(data[14] ?? 0) > 1e-6 || Math.abs(data[11] ?? 0) < 1e-6
  tmpMatrix.fromArray(data)
  if (!columnMajor) tmpMatrix.transpose()
  return tmpMatrix
}

export interface SceneOptions {
  canvas: HTMLCanvasElement
  video: HTMLVideoElement
  mirror?: boolean
}

export class FaceFilterScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  private readonly video: HTMLVideoElement
  private videoTexture: THREE.VideoTexture
  private readonly videoPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly faces: FaceTrack[] = []
  private active: FilterDef[] = []
  private readonly textures = new Map<string, Promise<THREE.Texture>>()
  private readonly loader = new THREE.TextureLoader()
  private width = 0
  private height = 0
  private disposed = false
  private buildToken = 0

  constructor(opts: SceneOptions) {
    this.video = opts.video
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    })
    this.renderer.setPixelRatio(1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.camera = new THREE.PerspectiveCamera(FACE_FOV_DEG, 16 / 9, 1, 10000)
    this.scene.scale.x = opts.mirror === false ? 1 : -1

    this.videoTexture = new THREE.VideoTexture(opts.video)
    this.videoTexture.colorSpace = THREE.SRGBColorSpace
    this.videoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.videoTexture, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
    )
    this.videoPlane.renderOrder = 0
    this.videoPlane.position.z = -VIDEO_DEPTH
    this.scene.add(this.videoPlane)
    this.resize()
  }

  /** Call when the video's intrinsic size changes. */
  resize() {
    const w = this.video.videoWidth || 1280
    const h = this.video.videoHeight || 720
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const planeH = 2 * VIDEO_DEPTH * Math.tan(THREE.MathUtils.degToRad(FACE_FOV_DEG / 2))
    this.videoPlane.scale.set(planeH * this.camera.aspect, planeH, 1)
  }

  get activeFilters() {
    return this.active
  }

  /** Replaces the worn filters (at most one per slot is enforced by the caller). */
  async setFilters(defs: FilterDef[]) {
    this.active = defs
    const token = ++this.buildToken
    const built = await Promise.all(defs.map((d) => this.buildOverlayFactory(d)))
    if (token !== this.buildToken || this.disposed) return
    for (const face of this.faces) this.applyOverlays(face, built)
    this.overlayFactories = built
  }

  private overlayFactories: (() => Overlay)[] = []

  private applyOverlays(face: FaceTrack, factories: (() => Overlay)[]) {
    for (const o of face.overlays) {
      face.group.remove(o.mesh)
      o.mesh.geometry.dispose()
    }
    face.overlays.length = 0
    for (const make of factories) {
      const o = make()
      face.overlays.push(o)
      face.group.add(o.mesh)
    }
  }

  private texture(src: string): Promise<THREE.Texture> {
    let p = this.textures.get(src)
    if (!p) {
      p = this.loader.loadAsync(assetUrl(src)).then((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
        return tex
      })
      this.textures.set(src, p)
    }
    return p
  }

  private async buildOverlayFactory(def: FilterDef): Promise<() => Overlay> {
    const tex = await this.texture(def.src)
    const order = RENDER_ORDER[slotOf(def)]
    if (def.type === 'sprite') {
      return () => {
        const geom = new THREE.PlaneGeometry(def.width, def.width * def.aspect)
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
          alphaTest: 0.02,
        })
        const mesh = new THREE.Mesh(geom, mat)
        mesh.renderOrder = order
        return { kind: 'sprite', def, mesh }
      }
    }
    const pts = await loadMeshPoints(def)
    const n = pts.points.length
    const uv = new Float32Array(n * 2)
    const landmarks = new Uint16Array(n)
    const coords: number[] = []
    pts.points.forEach((p, i) => {
      landmarks[i] = p.landmark
      uv[i * 2] = p.u
      uv[i * 2 + 1] = 1 - p.v
      coords.push(p.u, p.v)
    })
    const triangles = Delaunator.from(
      pts.points.map((p) => [p.u * 1000, p.v * 1000 * def.aspect]),
    ).triangles
    const index = Uint16Array.from(triangles)
    return () => {
      const geom = new THREE.BufferGeometry()
      const positions = new Float32Array(n * 3)
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geom.setAttribute('uv', new THREE.BufferAttribute(uv.slice(), 2))
      geom.setIndex(new THREE.BufferAttribute(index.slice(), 1))
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        alphaTest: 0.02,
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.renderOrder = order
      mesh.frustumCulled = false
      return { kind: 'mesh', def, mesh, landmarks, positions }
    }
  }

  private faceAt(i: number): FaceTrack {
    let f = this.faces[i]
    if (!f) {
      f = new FaceTrack()
      this.faces[i] = f
      this.scene.add(f.group)
      this.applyOverlays(f, this.overlayFactories)
    }
    return f
  }

  /** Pushes a detection result into the scene; call once per camera frame. */
  update(result: FaceLandmarkerResult | null, t: number) {
    this.resize()
    const count = result?.faceLandmarks.length ?? 0
    for (let i = 0; i < count; i++) {
      const face = this.faceAt(i)
      const lms = result!.faceLandmarks[i] ?? []
      const matrix = result!.facialTransformationMatrixes?.[i]?.data
      const bs: Blendshapes = new Map()
      for (const c of result!.faceBlendshapes?.[i]?.categories ?? []) bs.set(c.categoryName, c.score)
      if (t - face.lastSeen > 500) face.reset()
      face.update(lms, matrix, bs, t)
    }
    for (let i = count; i < this.faces.length; i++) {
      const face = this.faces[i]
      if (face && t - face.lastSeen > LOST_FACE_HOLD_MS) face.group.visible = false
    }
    this.layout()
  }

  get faceCount() {
    return this.faces.filter((f) => f.group.visible).length
  }

  private readonly tmpV = new THREE.Vector3()
  private readonly tmpOff = new THREE.Vector3()

  /** Normalized image point → camera-space point on the plane z = depth. */
  private project(nx: number, ny: number, depth: number, out: THREE.Vector3) {
    const halfH = Math.tan(THREE.MathUtils.degToRad(FACE_FOV_DEG / 2)) * Math.abs(depth)
    const halfW = halfH * this.camera.aspect
    out.set((nx * 2 - 1) * halfW, (1 - ny * 2) * halfH, depth)
    return out
  }

  private layout() {
    for (const face of this.faces) {
      if (!face.group.visible) continue
      for (const o of face.overlays) {
        if (o.kind === 'sprite') {
          const { landmark, offset } = o.def.anchor
          const nx = face.lm[landmark * 2] ?? 0.5
          const ny = face.lm[landmark * 2 + 1] ?? 0.5
          this.project(nx, ny, face.depth, this.tmpV)
          this.tmpOff.set(offset[0], offset[1], offset[2]).applyQuaternion(face.quat)
          o.mesh.position.copy(this.tmpV).add(this.tmpOff)
          o.mesh.quaternion.copy(face.quat)
          const trig = o.def.trigger
          o.mesh.visible = !trig || (face.blendshapes.get(trig.blendshape) ?? 0) >= trig.min
        } else {
          const pos = o.positions
          const depth = -(VIDEO_DEPTH - 2)
          for (let i = 0; i < o.landmarks.length; i++) {
            const li = o.landmarks[i] ?? 0
            this.project(face.lm[li * 2] ?? 0, face.lm[li * 2 + 1] ?? 0, depth, this.tmpV)
            pos[i * 3] = this.tmpV.x
            pos[i * 3 + 1] = this.tmpV.y
            pos[i * 3 + 2] = this.tmpV.z
          }
          const attr = o.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
          attr.needsUpdate = true
        }
      }
    }
  }

  render() {
    if (this.disposed) return
    this.renderer.render(this.scene, this.camera)
  }

  /** Snapshot of the composited frame (video + overlays) as a 2D canvas. */
  capture(): HTMLCanvasElement {
    this.render()
    const out = document.createElement('canvas')
    out.width = this.width
    out.height = this.height
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    ctx.drawImage(this.renderer.domElement, 0, 0)
    return out
  }

  dispose() {
    this.disposed = true
    for (const face of this.faces) {
      for (const o of face.overlays) o.mesh.geometry.dispose()
      this.scene.remove(face.group)
    }
    this.faces.length = 0
    this.videoTexture.dispose()
    this.videoPlane.geometry.dispose()
    this.videoPlane.material.dispose()
    for (const p of this.textures.values()) void p.then((t) => t.dispose())
    this.textures.clear()
    this.renderer.dispose()
  }
}
