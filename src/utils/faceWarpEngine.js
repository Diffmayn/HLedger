/**
 * Face Warp Engine - Implements landmark-based mesh warping for filter morphing
 * Ported from Python faceBlendCommon.py with optimizations for browser canvas
 *
 * Uses a mesh-based warping approach:
 * 1. Create a grid based on face landmarks
 * 2. Apply affine transforms to warp filter images to fit face topology
 * 3. Compose warped filter back into main canvas
 */

/**
 * Extract and normalize face landmarks from MediaPipe detection
 * @param {Array} rawLandmarks - 468-point array from MediaPipe
 * @param {number} width - Canvas/frame width
 * @param {number} height - Canvas/frame height
 * @returns {Array} Array of {x, y} points normalized to frame dimensions
 */
export function getLandmarks(rawLandmarks, width, height) {
  if (!rawLandmarks || rawLandmarks.length === 0) {
    return []
  }

  return rawLandmarks.map(landmark => ({
    x: Math.round(landmark.x * width),
    y: Math.round(landmark.y * height)
  }))
}

/**
 * Create a triangulation mesh from landmarks using simple ear-clipping
 * (Simplified alternative to full Delaunay for performance)
 * @param {Array} landmarks - Array of {x, y} points
 * @returns {Array} Array of triangles as [idx0, idx1, idx2]
 */
export function createWarpMesh(landmarks) {
  if (landmarks.length < 3) return []

  const triangles = []

  // For practical use, create a simplified mesh using nearest-neighbor triangulation
  // This is faster than Delaunay and works well for face landmarks
  const sorted = landmarks.map((p, idx) => ({ ...p, idx }))

  // Sort by x coordinate for faster construction
  sorted.sort((a, b) => a.x - b.x)

  // Create triangles connecting nearby landmarks
  for (let i = 0; i < sorted.length - 2; i++) {
    const p0 = sorted[i]
    const p1 = sorted[i + 1]
    const p2 = sorted[i + 2]

    triangles.push([p0.idx, p1.idx, p2.idx])
  }

  return triangles
}

/**
 * Calculate affine transformation matrix from source to destination triangle
 * @param {Array} srcTri - Source triangle as 3 points [{x, y}, ...]
 * @param {Array} dstTri - Destination triangle as 3 points [{x, y}, ...]
 * @returns {Array|null} 6-element affine matrix or null if degenerate
 */
export function getAffineTransform(srcTri, dstTri) {
  // Build system of equations for affine transform
  // [a b c]   [x']   [x]
  // [d e f] * [y'] = [y]
  // [0 0 1]   [1]    [1]

  const src = srcTri.map(p => [p.x, p.y])
  const dst = dstTri.map(p => [p.x, p.y])

  // Matrix inverse approach - solve for a, b, c, d, e, f
  const A = [
    [src[0][0], src[0][1], 1, 0, 0, 0],
    [0, 0, 0, src[0][0], src[0][1], 1],
    [src[1][0], src[1][1], 1, 0, 0, 0],
    [0, 0, 0, src[1][0], src[1][1], 1],
    [src[2][0], src[2][1], 1, 0, 0, 0],
    [0, 0, 0, src[2][0], src[2][1], 1]
  ]

  const B = [
    dst[0][0],
    dst[0][1],
    dst[1][0],
    dst[1][1],
    dst[2][0],
    dst[2][1]
  ]

  // Solve using Gaussian elimination
  const X = gaussianElimination(A, B)
  return X ? [X[0], X[1], X[2], X[3], X[4], X[5]] : null
}

/**
 * Solve linear system Ax = B using Gaussian elimination
 */
function gaussianElimination(A, B) {
  const n = A.length
  const M = A.map((row, i) => [...row, B[i]])

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k
      }
    }

    // Swap rows
    [M[i], M[maxRow]] = [M[maxRow], M[i]]

    // Check for singular matrix
    if (Math.abs(M[i][i]) < 1e-10) {
      return null
    }

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i]
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j]
      }
    }
  }

  // Back substitution
  const x = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n]
    for (let j = i + 1; j < n; j++) {
      x[i] -= M[i][j] * x[j]
    }
    x[i] /= M[i][i]
  }

  return x
}

/**
 * Apply affine transform to a point
 */
export function transformPoint(point, matrix) {
  if (!matrix) return point
  const [a, b, c, d, e, f] = matrix
  return {
    x: a * point.x + b * point.y + c,
    y: d * point.x + e * point.y + f
  }
}

/**
 * Warp a filter image using mesh and render to destination canvas
 * @param {HTMLCanvasElement} srcCanvas - Source filter image as canvas
 * @param {HTMLCanvasElement} dstCanvas - Destination canvas to render to
 * @param {Array} srcLandmarks - Original filter landmarks
 * @param {Array} dstLandmarks - Face landmarks to warp to
 * @param {Array} triangles - Triangle mesh connecting landmarks
 */
export function warpFilterOnCanvas(
  srcCanvas,
  dstCanvas,
  srcLandmarks,
  dstLandmarks,
  triangles
) {
  const srcCtx = srcCanvas.getContext('2d')
  const dstCtx = dstCanvas.getContext('2d')

  if (!srcCtx || !dstCtx) return

  for (const triangle of triangles) {
    if (triangle.length !== 3) continue

    const [i0, i1, i2] = triangle

    if (
      i0 >= srcLandmarks.length ||
      i1 >= srcLandmarks.length ||
      i2 >= srcLandmarks.length ||
      i0 >= dstLandmarks.length ||
      i1 >= dstLandmarks.length ||
      i2 >= dstLandmarks.length
    ) {
      continue
    }

    const srcTri = [
      srcLandmarks[i0],
      srcLandmarks[i1],
      srcLandmarks[i2]
    ]
    const dstTri = [
      dstLandmarks[i0],
      dstLandmarks[i1],
      dstLandmarks[i2]
    ]

    // Get transform from destination to source
    const matrix = getAffineTransform(dstTri, srcTri)
    if (!matrix) continue

    // Get bounding box of destination triangle
    const bbox = getBoundingBox([dstTri[0], dstTri[1], dstTri[2]])
    const minX = Math.max(0, Math.floor(bbox.minX))
    const minY = Math.max(0, Math.floor(bbox.minY))
    const maxX = Math.min(dstCanvas.width, Math.ceil(bbox.maxX))
    const maxY = Math.min(dstCanvas.height, Math.ceil(bbox.maxY))

    if (maxX <= minX || maxY <= minY) continue

    // Get image data from source and destination
    const srcImageData = srcCtx.getImageData(
      0,
      0,
      srcCanvas.width,
      srcCanvas.height
    )
    const dstImageData = dstCtx.getImageData(minX, minY, maxX - minX, maxY - minY)

    const srcData = srcImageData.data
    const dstData = dstImageData.data

    // Perform pixel-wise warp
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        // Check if pixel is inside destination triangle
        if (!isInsideTriangle({ x, y }, dstTri)) continue

        // Transform to source space
        const srcPoint = transformPoint({ x, y }, matrix)

        // Bilinear interpolation for smooth results
        const color = bilinearInterpolate(
          srcData,
          srcPoint.x,
          srcPoint.y,
          srcCanvas.width,
          srcCanvas.height
        )

        if (color) {
          const dstIdx = ((y - minY) * (maxX - minX) + (x - minX)) * 4
          dstData[dstIdx] = color.r
          dstData[dstIdx + 1] = color.g
          dstData[dstIdx + 2] = color.b
          dstData[dstIdx + 3] = color.a
        }
      }
    }

    dstCtx.putImageData(dstImageData, minX, minY)
  }
}

/**
 * Check if point is inside triangle using barycentric coordinates
 */
function isInsideTriangle(point, triangle) {
  const [p0, p1, p2] = triangle
  const denom =
    (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y)

  if (Math.abs(denom) < 1e-10) return false

  const a =
    ((p1.y - p2.y) * (point.x - p2.x) + (p2.x - p1.x) * (point.y - p2.y)) /
    denom
  const b =
    ((p2.y - p0.y) * (point.x - p2.x) + (p0.x - p2.x) * (point.y - p2.y)) /
    denom
  const c = 1 - a - b

  return a >= 0 && b >= 0 && c >= 0
}

/**
 * Bilinear interpolation for smooth pixel sampling
 */
function bilinearInterpolate(imageData, x, y, width, height) {
  x = Math.max(0, Math.min(width - 1, x))
  y = Math.max(0, Math.min(height - 1, y))

  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi

  const x0 = Math.min(xi, width - 1)
  const x1 = Math.min(xi + 1, width - 1)
  const y0 = Math.min(yi, height - 1)
  const y1 = Math.min(yi + 1, height - 1)

  const p00 = getPixel(imageData, x0, y0, width)
  const p10 = getPixel(imageData, x1, y0, width)
  const p01 = getPixel(imageData, x0, y1, width)
  const p11 = getPixel(imageData, x1, y1, width)

  return {
    r: Math.round(
      p00.r * (1 - xf) * (1 - yf) +
        p10.r * xf * (1 - yf) +
        p01.r * (1 - xf) * yf +
        p11.r * xf * yf
    ),
    g: Math.round(
      p00.g * (1 - xf) * (1 - yf) +
        p10.g * xf * (1 - yf) +
        p01.g * (1 - xf) * yf +
        p11.g * xf * yf
    ),
    b: Math.round(
      p00.b * (1 - xf) * (1 - yf) +
        p10.b * xf * (1 - yf) +
        p01.b * (1 - xf) * yf +
        p11.b * xf * yf
    ),
    a: Math.round(
      p00.a * (1 - xf) * (1 - yf) +
        p10.a * xf * (1 - yf) +
        p01.a * (1 - xf) * yf +
        p11.a * xf * yf
    )
  }
}

/**
 * Get pixel value from image data
 */
function getPixel(imageData, x, y, width) {
  const idx = (Math.floor(y) * width + Math.floor(x)) * 4
  return {
    r: imageData[idx],
    g: imageData[idx + 1],
    b: imageData[idx + 2],
    a: imageData[idx + 3]
  }
}

/**
 * Get bounding box of triangle
 */
function getBoundingBox(points) {
  let minX = points[0].x,
    maxX = points[0].x
  let minY = points[0].y,
    maxY = points[0].y

  for (let i = 1; i < points.length; i++) {
    minX = Math.min(minX, points[i].x)
    maxX = Math.max(maxX, points[i].x)
    minY = Math.min(minY, points[i].y)
    maxY = Math.max(maxY, points[i].y)
  }

  return { minX, maxX, minY, maxY }
}

/**
 * Get annotation landmark indices for a specific filter
 * These define which face landmarks control each filter type
 */
export function getFilterAnnotationLandmarks(filterType) {
  const annotationMap = {
    // Hat/crown filters use forehead and upper face landmarks
    hat: [
      10, 109, 108, 107, 66, 69, 103, 104, 105, 9, 8, 151, 337, 299, 333,
      298, 301, 368, 12, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21
    ],

    // Glasses use eye landmarks
    glasses: [
      33, 160, 158, 173, 153, 144, 398, 385, 387, 466, 373, 380, 61, 40, 39,
      0, 269, 270, 291, 321, 405, 17, 181, 91, 78, 81, 13, 311, 306, 402, 14,
      178, 162, 54, 67, 10, 297, 284, 389
    ],

    // Mustache uses lip landmarks
    mustache: [
      61, 40, 39, 0, 269, 270, 291, 321, 405, 17, 181, 91
    ],

    // Default/generic uses face outline
    default: [
      127, 93, 58, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 288,
      323, 356, 70, 63, 105, 66, 55, 285, 296, 334, 293, 300, 168, 6, 195, 4,
      64, 60, 94, 290, 439, 33, 160, 158, 173, 153, 144, 398, 385, 387, 466,
      373, 380, 61, 40, 39, 0, 269, 270, 291, 321, 405, 17, 181, 91, 78, 81,
      13, 311, 306, 402, 14, 178, 162, 54, 67, 10, 297, 284, 389
    ]
  }

  return annotationMap[filterType] || annotationMap.default
}
