import React, { useRef, useCallback, useEffect } from 'react'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'

const RULER_HEIGHT = 28
const TRACK_HEIGHT = 48
const TRACK_GAP = 2
const MIN_ZOOM = 20   // px per second
const MAX_ZOOM = 500

const CLIP_COLORS = [
  'hsl(263, 70%, 50%)', // primary purple
  'hsl(200, 70%, 50%)', // blue
  'hsl(150, 70%, 45%)', // green
  'hsl(30, 80%, 55%)',  // orange
  'hsl(340, 70%, 50%)', // pink
]

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tracks = useProjectStore((s) => s.timeline.tracks)
  const duration = useUIStore((s) => s.duration)
  const { playhead, timelineZoom, timelineScrollX, setPlayhead, setTimelineZoom, setTimelineScrollX } = useUIStore()

  const totalWidth = Math.max(duration * timelineZoom, 600)
  const totalHeight = RULER_HEIGHT + tracks.length * (TRACK_HEIGHT + TRACK_GAP) + 40

  const selectedClipId = useUIStore((s) => s.selectedClipId)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height

    // Clear
    ctx.clearRect(0, 0, w, h)

    const ox = -timelineScrollX // offset x

    // Draw ruler
    ctx.fillStyle = 'hsl(240, 10%, 6%)'
    ctx.fillRect(0, 0, w, RULER_HEIGHT)

    // Time marks
    const step = getTimeStep(timelineZoom)
    const startTime = Math.floor(timelineScrollX / timelineZoom / step) * step
    const endTime = (timelineScrollX + w) / timelineZoom

    ctx.fillStyle = 'hsl(240, 5%, 40%)'
    ctx.font = '10px -apple-system, sans-serif'
    ctx.textAlign = 'center'

    for (let t = startTime; t <= endTime + step; t += step) {
      const x = t * timelineZoom + ox
      if (x < -20 || x > w + 20) continue

      // Major tick
      ctx.strokeStyle = 'hsl(240, 5%, 20%)'
      ctx.beginPath()
      ctx.moveTo(x, RULER_HEIGHT - 8)
      ctx.lineTo(x, RULER_HEIGHT)
      ctx.stroke()

      ctx.fillText(formatTime(t), x, RULER_HEIGHT - 12)

      // Grid line extending down
      ctx.strokeStyle = 'hsl(240, 5%, 10%)'
      ctx.beginPath()
      ctx.moveTo(x, RULER_HEIGHT)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    // Draw tracks
    tracks.forEach((track, ti) => {
      const ty = RULER_HEIGHT + ti * (TRACK_HEIGHT + TRACK_GAP)

      // Track background
      ctx.fillStyle = 'hsl(240, 10%, 8%)'
      ctx.fillRect(0, ty, w, TRACK_HEIGHT)

      // Track label
      ctx.fillStyle = 'hsl(240, 5%, 50%)'
      ctx.font = '10px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(track.name, 6, ty + 14)

      // Clips
      track.clips.forEach((clip) => {
        const cx = clip.startInTimeline * timelineZoom + ox
        const cw = clip.duration * timelineZoom
        if (cx + cw < 0 || cx > w) return

        const color = clip.color || CLIP_COLORS[ti % CLIP_COLORS.length]

        // Clip body
        ctx.fillStyle = color
        ctx.globalAlpha = 0.6
        roundRect(ctx, cx, ty + 4, cw, TRACK_HEIGHT - 8, 3)
        ctx.fill()
        ctx.globalAlpha = 1

        // Clip border (highlight if selected)
        const isSelected = clip.id === selectedClipId
        ctx.strokeStyle = isSelected ? 'hsl(50, 100%, 60%)' : color
        ctx.lineWidth = isSelected ? 2 : 1
        roundRect(ctx, cx, ty + 4, cw, TRACK_HEIGHT - 8, 3)
        ctx.stroke()

        // Clip label
        if (cw > 40) {
          ctx.fillStyle = 'white'
          ctx.font = '10px -apple-system, sans-serif'
          ctx.textAlign = 'left'
          const label = formatTime(clip.duration)
          ctx.fillText(label, cx + 6, ty + TRACK_HEIGHT / 2 + 3)
        }
      })
    })

    // Playhead
    const px = playhead * timelineZoom + ox
    if (px >= 0 && px <= w) {
      ctx.strokeStyle = 'hsl(0, 80%, 60%)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
      ctx.stroke()

      // Playhead triangle
      ctx.fillStyle = 'hsl(0, 80%, 60%)'
      ctx.beginPath()
      ctx.moveTo(px - 5, 0)
      ctx.lineTo(px + 5, 0)
      ctx.lineTo(px, 8)
      ctx.closePath()
      ctx.fill()
    }
  }, [tracks, duration, playhead, timelineZoom, timelineScrollX, selectedClipId])

  // Redraw on state changes (non-playing)
  useEffect(() => {
    draw()
  }, [draw])

  // Smooth animation loop during playback
  const isPlaying = useUIStore((s) => s.isPlaying)

  useEffect(() => {
    if (!isPlaying) return
    let raf: number
    const animate = () => {
      draw()
      // Auto-scroll to keep playhead visible
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const px = useUIStore.getState().playhead * timelineZoom - timelineScrollX
        if (px > rect.width - 40) {
          setTimelineScrollX(useUIStore.getState().playhead * timelineZoom - rect.width * 0.3)
        }
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, draw, timelineZoom, timelineScrollX, setTimelineScrollX])

  useEffect(() => {
    const observer = new ResizeObserver(draw)
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [draw])

  const selectClip = useUIStore((s) => s.selectClip)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const x = mouseX + timelineScrollX
      const time = x / timelineZoom
      setPlayhead(Math.max(0, Math.min(duration, time)))

      // Check if a clip was clicked
      if (mouseY > RULER_HEIGHT) {
        const trackIndex = Math.floor((mouseY - RULER_HEIGHT) / (TRACK_HEIGHT + TRACK_GAP))
        const track = tracks[trackIndex]
        if (track) {
          const clicked = track.clips.find((clip) => {
            const cx = clip.startInTimeline * timelineZoom - timelineScrollX
            const cw = clip.duration * timelineZoom
            return mouseX >= cx && mouseX <= cx + cw
          })
          selectClip(clicked?.id ?? null)
          return
        }
      }
      selectClip(null)
    },
    [timelineZoom, timelineScrollX, duration, setPlayhead, tracks, selectClip]
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, timelineZoom * delta))
        setTimelineZoom(newZoom)
      } else {
        setTimelineScrollX(Math.max(0, timelineScrollX + e.deltaX + e.deltaY))
      }
    },
    [timelineZoom, timelineScrollX, setTimelineZoom, setTimelineScrollX]
  )

  if (tracks.length === 0 && duration === 0) {
    return (
      <div className="h-[120px] border-t border-border flex items-center justify-center text-muted-foreground text-xs">
        Import a video to see the timeline
      </div>
    )
  }

  return (
    <div ref={containerRef} className="border-t border-border overflow-hidden" style={{ height: Math.max(120, totalHeight) }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
        onWheel={handleWheel}
      />
    </div>
  )
}

function getTimeStep(zoom: number): number {
  if (zoom > 200) return 1
  if (zoom > 80) return 5
  if (zoom > 30) return 10
  return 30
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
