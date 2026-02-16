/** Format seconds to MM:SS or HH:MM:SS */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Format seconds to timecode HH:MM:SS:FF */
export function formatTimecode(seconds: number, fps = 30): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  return [h, m, s, f].map((v) => v.toString().padStart(2, '0')).join(':')
}

/** Parse timecode string to seconds */
export function parseTimecode(tc: string, fps = 30): number {
  const parts = tc.split(':').map(Number)
  if (parts.length === 4) {
    const [h, m, s, f] = parts
    return h * 3600 + m * 60 + s + f / fps
  }
  if (parts.length === 3) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }
  if (parts.length === 2) {
    const [m, s] = parts
    return m * 60 + s
  }
  return parts[0] || 0
}
