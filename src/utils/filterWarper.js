/**
 * Filter Warper - Orchestrates morphing/warping of filters to face landmarks
 * Coordinates between filter images, landmarks, and the warp engine
 */

import {
  getLandmarks,
  createWarpMesh,
  warpFilterOnCanvas,
  getFilterAnnotationLandmarks
} from './faceWarpEngine'

/**
 * Prepare a filter image for warping
 * @param {HTMLImageElement} filterImg - The filter image element
 * @returns {HTMLCanvasElement} Canvas containing the filter
 */
export function prepareFilterForWarp(filterImg) {
  const canvas = document.createElement('canvas')
  canvas.width = filterImg.width
  canvas.height = filterImg.height

  const ctx = canvas.getContext('2d')
  ctx.drawImage(filterImg, 0, 0)

  return canvas
}

/**
 * Apply warping to a filter based on face landmarks
 * @param {HTMLImageElement} filterImg - The filter image
 * @param {Array} faceLandmarks - MediaPipe 468-point landmarks
 * @param {number} canvasWidth - Target canvas width
 * @param {number} canvasHeight - Target canvas height
 * @param {string} filterType - Filter type (hat, glasses, etc.)
 * @param {HTMLCanvasElement} outputCanvas - Canvas to render warped filter to
 * @returns {boolean} Success status
 */
export function applyFilterWarp(
  filterImg,
  faceLandmarks,
  canvasWidth,
  canvasHeight,
  filterType = 'default',
  outputCanvas
) {
  if (!filterImg || !faceLandmarks || faceLandmarks.length === 0) {
    return false
  }

  try {
    // Get annotation landmarks that define this filter's warp region
    const annotationIndices = getFilterAnnotationLandmarks(filterType)

    // Extract only the relevant landmarks for this filter
    const relevantLandmarks = annotationIndices
      .map(idx => faceLandmarks[idx])
      .filter(l => l !== undefined)

    if (relevantLandmarks.length < 3) {
      return false
    }

    // Normalize landmarks to canvas dimensions
    const normalizedLandmarks = getLandmarks(
      relevantLandmarks,
      canvasWidth,
      canvasHeight
    )

    // Create a warp mesh from the landmark points
    const warpMesh = createWarpMesh(normalizedLandmarks)

    if (warpMesh.length === 0) {
      return false
    }

    // Prepare filter image as a canvas
    const filterCanvas = prepareFilterForWarp(filterImg)

    // Create source landmarks from filter image (default uniform grid)
    const srcLandmarks = createUniformLandmarkGrid(
      filterImg.width,
      filterImg.height,
      normalizedLandmarks.length
    )

    // Apply warping transformation
    warpFilterOnCanvas(
      filterCanvas,
      outputCanvas,
      srcLandmarks,
      normalizedLandmarks,
      warpMesh
    )

    return true
  } catch (error) {
    console.warn('Filter warp failed:', error)
    return false
  }
}

/**
 * Create a uniform landmark grid for the source filter image
 * Maps filter image space to normalized face space
 */
function createUniformLandmarkGrid(imgWidth, imgHeight, count) {
  const landmarks = []
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)

  const cellW = imgWidth / (cols + 1)
  const cellH = imgHeight / (rows + 1)

  for (let i = 0; i < count && landmarks.length < count; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols

    landmarks.push({
      x: (col + 1) * cellW,
      y: (row + 1) * cellH
    })
  }

  return landmarks
}

/**
 * Composite a warped filter overlay onto a main canvas with blending
 * @param {HTMLCanvasElement} mainCanvas - Main video frame canvas
 * @param {HTMLCanvasElement} filterCanvas - Warped filter canvas
 * @param {number} opacity - Blending opacity (0-1)
 */
export function compositeWarpedFilter(mainCanvas, filterCanvas, opacity = 1) {
  const mainCtx = mainCanvas.getContext('2d')
  if (!mainCtx) return

  mainCtx.globalAlpha = opacity
  mainCtx.drawImage(filterCanvas, 0, 0)
  mainCtx.globalAlpha = 1
}

/**
 * Quick fallback to static positioning (non-warped)
 * Used when warping fails or is disabled
 */
export function drawFilterStatic(
  ctx,
  filterImg,
  position,
  scale = 1,
  angle = 0
) {
  if (!ctx || !filterImg) return

  ctx.save()
  ctx.translate(position.x, position.y)
  ctx.rotate(angle)
  ctx.scale(scale, scale)
  ctx.drawImage(filterImg, -filterImg.width / 2, -filterImg.height / 2)
  ctx.restore()
}

/**
 * Get warp quality/performance metrics
 * @returns {Object} Metrics object with quality settings
 */
export function getWarpQualitySettings() {
  return {
    enableDetailedMesh: false, // Set true for higher quality but slower
    meshDensity: 'medium', // 'low', 'medium', 'high'
    enableBilinearInterp: true, // Smooth interpolation
    maxTriangles: 1000 // Limit for performance
  }
}

/**
 * Check if a filter supports warping
 */
export function supportsWarping(filter) {
  return filter?.morph === true
}

/**
 * Validate filter warping prerequisites
 */
export function validateWarpPrerequisites(filter, landmarks, canvas) {
  const issues = []

  if (!filter) {
    issues.push('Filter not provided')
  }

  if (!landmarks || landmarks.length < 10) {
    issues.push('Insufficient landmarks for warping')
  }

  if (!canvas) {
    issues.push('Output canvas not provided')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}
