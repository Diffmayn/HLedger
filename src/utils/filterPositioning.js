/**
 * Maps normalized face landmarks to filter overlay positions.
 * Supports MediaPipe (468 points) and face-api.js (68 points).
 */

// Key landmark indices
const FOREHEAD_TOP = 10
const CHIN = 152
const NOSE_BRIDGE = 168
const NOSE_TIP = 1
const NOSE_BOTTOM = 164
const UPPER_LIP_CENTER = 0
const LEFT_EYE_OUTER = 33
const RIGHT_EYE_OUTER = 263
const LEFT_EYE_INNER = 133
const RIGHT_EYE_INNER = 362
const MOUTH_LEFT = 61
const MOUTH_RIGHT = 291
const LEFT_FACE = 234
const RIGHT_FACE = 454
const LEFT_EYE_TOP = 159
const RIGHT_EYE_TOP = 386

// face-api.js 68-point indices
const FA_LEFT_FACE = 0
const FA_CHIN = 8
const FA_RIGHT_FACE = 16
const FA_NOSE_BRIDGE = 27
const FA_NOSE_BOTTOM = 33
const FA_LEFT_EYE_OUTER = 36
const FA_RIGHT_EYE_OUTER = 45
const FA_MOUTH_LEFT = 48
const FA_UPPER_LIP_CENTER = 51
const FA_MOUTH_RIGHT = 54

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function getAngle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

function getLandmarksByBackend(faceLandmarks) {
  if (!faceLandmarks || faceLandmarks.length === 0) return null

  // Heuristic: face-api.js returns 68 points, MediaPipe returns 468
  if (faceLandmarks.length <= 100) {
    const left = faceLandmarks[FA_LEFT_FACE]
    const right = faceLandmarks[FA_RIGHT_FACE]
    const chin = faceLandmarks[FA_CHIN]
    const noseBridge = faceLandmarks[FA_NOSE_BRIDGE]

    if (!left || !right || !chin || !noseBridge) return null

    const foreheadApprox = {
      x: noseBridge.x,
      y: noseBridge.y - (chin.y - noseBridge.y) * 0.52,
      z: 0
    }

    return {
      top: foreheadApprox,
      chin,
      left,
      right,
      noseBridge,
      noseBottom: faceLandmarks[FA_NOSE_BOTTOM],
      upperLip: faceLandmarks[FA_UPPER_LIP_CENTER],
      leftEye: faceLandmarks[FA_LEFT_EYE_OUTER],
      rightEye: faceLandmarks[FA_RIGHT_EYE_OUTER],
      mouthLeft: faceLandmarks[FA_MOUTH_LEFT],
      mouthRight: faceLandmarks[FA_MOUTH_RIGHT]
    }
  }

  return {
    top: faceLandmarks[FOREHEAD_TOP],
    chin: faceLandmarks[CHIN],
    left: faceLandmarks[LEFT_FACE],
    right: faceLandmarks[RIGHT_FACE],
    noseBridge: faceLandmarks[NOSE_BRIDGE],
    noseBottom: faceLandmarks[NOSE_BOTTOM],
    upperLip: faceLandmarks[UPPER_LIP_CENTER],
    leftEye: faceLandmarks[LEFT_EYE_OUTER],
    rightEye: faceLandmarks[RIGHT_EYE_OUTER],
    mouthLeft: faceLandmarks[MOUTH_LEFT],
    mouthRight: faceLandmarks[MOUTH_RIGHT]
  }
}

export function getHatPosition(faceLandmarks, canvasWidth, canvasHeight) {
  const points = getLandmarksByBackend(faceLandmarks)
  if (!points?.top || !points?.chin || !points?.left || !points?.right) return null

  const { top, chin, left, right } = points

  const faceWidth = dist(left, right) * canvasWidth
  const faceHeight = dist(top, chin) * canvasHeight
  const width = faceWidth * 1.85
  const height = faceHeight * 0.95
  const angle = getAngle(left, right)

  const cx = top.x * canvasWidth
  const cy = top.y * canvasHeight - faceHeight * 0.42

  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    angle,
    preserveAspectRatio: true
  }
}

export function getGlassesPosition(faceLandmarks, canvasWidth, canvasHeight) {
  const points = getLandmarksByBackend(faceLandmarks)
  if (!points?.leftEye || !points?.rightEye) return null

  const { leftEye, rightEye } = points

  const eyeDist = dist(leftEye, rightEye) * canvasWidth
  const width = eyeDist * 1.6
  const height = eyeDist * 0.72
  const angle = getAngle(leftEye, rightEye)

  const center = midpoint(leftEye, rightEye)
  const cx = center.x * canvasWidth
  const cy = center.y * canvasHeight

  return { x: cx - width / 2, y: cy - height / 2, width, height, angle, preserveAspectRatio: true }
}

export function getMoustachePosition(faceLandmarks, canvasWidth, canvasHeight) {
  const points = getLandmarksByBackend(faceLandmarks)
  if (!points?.noseBottom || !points?.upperLip || !points?.mouthLeft || !points?.mouthRight) return null

  const { noseBottom, upperLip, mouthLeft, mouthRight } = points

  const mouthWidth = dist(mouthLeft, mouthRight) * canvasWidth
  const width = mouthWidth * 1.5
  const height = width * 0.5
  const angle = getAngle(mouthLeft, mouthRight)

  const cy = ((noseBottom.y + upperLip.y) / 2) * canvasHeight
  const cx = ((mouthLeft.x + mouthRight.x) / 2) * canvasWidth

  return { x: cx - width / 2, y: cy - height / 2, width, height, angle, preserveAspectRatio: true }
}

export function getNosePosition(faceLandmarks, canvasWidth, canvasHeight) {
  const points = getLandmarksByBackend(faceLandmarks)
  if (!points?.noseBridge || !points?.noseBottom || !points?.mouthLeft || !points?.mouthRight) return null

  const { noseBridge, noseBottom, mouthLeft, mouthRight } = points
  const mouthWidth = dist(mouthLeft, mouthRight) * canvasWidth
  const width = mouthWidth * 0.75
  const height = width * 0.7
  const cx = noseBottom.x * canvasWidth
  const cy = ((noseBridge.y + noseBottom.y) / 2) * canvasHeight + height * 0.12

  return { x: cx - width / 2, y: cy - height / 2, width, height, angle: 0, preserveAspectRatio: true }
}

export function getMouthAccessoryPosition(faceLandmarks, canvasWidth, canvasHeight) {
  const points = getLandmarksByBackend(faceLandmarks)
  if (!points?.mouthLeft || !points?.mouthRight || !points?.upperLip) return null

  const { mouthLeft, mouthRight, upperLip } = points
  const mouthWidth = dist(mouthLeft, mouthRight) * canvasWidth
  const width = mouthWidth * 1.15
  const height = width * 0.6
  const angle = getAngle(mouthLeft, mouthRight)
  const cx = ((mouthLeft.x + mouthRight.x) / 2) * canvasWidth
  const cy = upperLip.y * canvasHeight + height * 0.55

  return { x: cx - width / 2, y: cy - height / 2, width, height, angle, preserveAspectRatio: true }
}

export function getFaceMaskPosition(faceLandmarks, canvasWidth, canvasHeight) {
  const points = getLandmarksByBackend(faceLandmarks)
  if (!points?.top || !points?.chin || !points?.left || !points?.right) return null

  const { top, chin, left, right } = points
  const faceWidth = dist(left, right) * canvasWidth
  const faceHeight = dist(top, chin) * canvasHeight
  const width = faceWidth * 1.35
  const height = faceHeight * 1.65
  const angle = getAngle(left, right)
  const cx = ((left.x + right.x) / 2) * canvasWidth
  const cy = ((top.y + chin.y) / 2) * canvasHeight + faceHeight * 0.08

  return { x: cx - width / 2, y: cy - height / 2, width, height, angle, preserveAspectRatio: true }
}

export function getAccessoryPosition(faceLandmarks, canvasWidth, canvasHeight, type) {
  switch (type) {
    case 'hat': return getHatPosition(faceLandmarks, canvasWidth, canvasHeight)
    case 'glasses': return getGlassesPosition(faceLandmarks, canvasWidth, canvasHeight)
    case 'moustache': return getMoustachePosition(faceLandmarks, canvasWidth, canvasHeight)
    case 'nose': return getNosePosition(faceLandmarks, canvasWidth, canvasHeight)
    case 'mouth': return getMouthAccessoryPosition(faceLandmarks, canvasWidth, canvasHeight)
    case 'face': return getFaceMaskPosition(faceLandmarks, canvasWidth, canvasHeight)
    default: return null
  }
}

export function drawFilter(ctx, img, position) {
  if (!position || !img) return
  const { x, y, width, height, angle, preserveAspectRatio = true } = position
  let drawWidth = width
  let drawHeight = height

  if (preserveAspectRatio && img.width && img.height) {
    const scale = Math.min(width / img.width, height / img.height)
    drawWidth = img.width * scale
    drawHeight = img.height * scale
  }

  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.rotate(angle)
  ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}
