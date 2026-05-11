import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { getAccessoryPosition, drawFilter } from '../../utils/filterPositioning'
import { loadImage } from '../../utils/imageUtils'
import { applyFilterWarp, supportsWarping } from '../../utils/filterWarper'

const FilterOverlay = forwardRef(function FilterOverlay(
  { videoRef, landmarks, activeFilters, width, height },
  ref
) {
  const canvasRef = useRef(null)
  const imagesRef = useRef({})
  const rafRef = useRef(null)
  const landmarksRef = useRef(landmarks)
  const activeFiltersRef = useRef(activeFilters)
  const warpCanvasRef = useRef(null) // Temporary canvas for warped filters

  // Keep refs in sync with props so RAF loop always uses latest data
  useEffect(() => { landmarksRef.current = landmarks }, [landmarks])
  useEffect(() => { activeFiltersRef.current = activeFilters }, [activeFilters])

  // Pre-load filter images whenever activeFilters changes
  useEffect(() => {
    activeFilters.forEach(async (filter) => {
      if (!imagesRef.current[filter.src]) {
        try {
          const img = await loadImage(filter.src)
          imagesRef.current[filter.src] = img
        } catch (e) {
          console.warn('Failed to load filter image:', filter.name, e)
        }
      }
    })
  }, [activeFilters])

  // Continuous RAF-based drawing loop — starts once, always runs
  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const lm = landmarksRef.current
        const af = activeFiltersRef.current
        if (lm && lm.length > 0 && af.length > 0) {
          ctx.save()
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
          for (const face of lm) {
            for (const filter of af) {
              const img = imagesRef.current[filter.src]
              if (!img) continue

              // Check if filter supports morphing/warping
              if (supportsWarping(filter)) {
                // Try warping approach
                if (!warpCanvasRef.current) {
                  warpCanvasRef.current = document.createElement('canvas')
                }
                const warpCanvas = warpCanvasRef.current
                warpCanvas.width = canvas.width
                warpCanvas.height = canvas.height

                const warpCtx = warpCanvas.getContext('2d')
                warpCtx.clearRect(0, 0, warpCanvas.width, warpCanvas.height)

                // Apply warping to filter based on landmarks
                const warpSuccess = applyFilterWarp(
                  img,
                  face,
                  canvas.width,
                  canvas.height,
                  filter.type || 'default',
                  warpCanvas
                )

                if (warpSuccess) {
                  // Draw warped result
                  ctx.globalAlpha = filter.opacity || 1
                  ctx.drawImage(warpCanvas, 0, 0)
                  ctx.globalAlpha = 1
                } else {
                  // Fallback to static positioning if warping fails
                  const pos = getAccessoryPosition(
                    face,
                    canvas.width,
                    canvas.height,
                    filter
                  )
                  if (pos) drawFilter(ctx, img, pos, filter.opacity || 1)
                }
              } else {
                // Use traditional static positioning for non-morphable filters
                const pos = getAccessoryPosition(
                  face,
                  canvas.width,
                  canvas.height,
                  filter
                )
                if (pos) drawFilter(ctx, img, pos, filter.opacity || 1)
              }
            }
          }
          ctx.restore()
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, []) // runs once on mount, uses refs for live data

  // Expose canvas for photo capture
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }))

  return (
    <canvas
      ref={canvasRef}
      width={width || 1280}
      height={height || 720}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  )
})

export default FilterOverlay

