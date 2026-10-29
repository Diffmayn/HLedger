import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import { assetUrl } from './manifest'

export type { FaceLandmarkerResult }

const REMOTE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export interface LandmarkerOptions {
  numFaces?: number
  onProgress?: (stage: 'wasm' | 'model' | 'ready') => void
}

let instance: Promise<FaceLandmarker> | null = null
let currentDelegate: 'GPU' | 'CPU' = 'GPU'

async function resolveModelUrl(): Promise<string> {
  // A self-hosted copy wins, but SPA hosts answer 200 + index.html for missing files,
  // so verify the zip magic bytes before trusting the local path.
  const local = assetUrl('models/face_landmarker.task')
  try {
    const res = await fetch(local, { headers: { Range: 'bytes=0-3' } })
    if (res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')) {
      const head = new Uint8Array(await res.arrayBuffer())
      if (head[0] === 0x50 && head[1] === 0x4b) return local
    }
  } catch {
    /* fall through */
  }
  return REMOTE_MODEL
}

async function createLandmarker(delegate: 'GPU' | 'CPU', opts: LandmarkerOptions) {
  opts.onProgress?.('wasm')
  const vision = await FilesetResolver.forVisionTasks(assetUrl('mediapipe/wasm'))
  opts.onProgress?.('model')
  const modelAssetPath = await resolveModelUrl()
  const lm = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath, delegate },
    runningMode: 'VIDEO',
    numFaces: opts.numFaces ?? 3,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  opts.onProgress?.('ready')
  return lm
}

/** Shared FaceLandmarker; GPU first, CPU fallback. Safe to call repeatedly. */
export function getLandmarker(opts: LandmarkerOptions = {}): Promise<FaceLandmarker> {
  if (!instance) {
    instance = createLandmarker('GPU', opts).catch(async (err) => {
      console.warn('[ar] GPU delegate failed, falling back to CPU', err)
      currentDelegate = 'CPU'
      return createLandmarker('CPU', opts)
    })
    instance.catch(() => {
      instance = null
    })
  }
  return instance
}

export function landmarkerDelegate() {
  return currentDelegate
}

export function disposeLandmarker() {
  if (!instance) return
  void instance.then((lm) => lm.close()).catch(() => {})
  instance = null
}

/** Downscale target: detection runs on at most this many pixels wide. */
export const DETECT_MAX_WIDTH = 640

export class DetectInput {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  /** Returns the element to hand to detectForVideo: the video itself or a downscaled copy. */
  frame(video: HTMLVideoElement): HTMLVideoElement | HTMLCanvasElement {
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || w <= DETECT_MAX_WIDTH * 1.5) return video
    const scale = DETECT_MAX_WIDTH / w
    const tw = Math.round(w * scale)
    const th = Math.round(h * scale)
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: false })
    }
    if (this.canvas.width !== tw || this.canvas.height !== th) {
      this.canvas.width = tw
      this.canvas.height = th
    }
    this.ctx?.drawImage(video, 0, 0, tw, th)
    return this.canvas
  }
}
