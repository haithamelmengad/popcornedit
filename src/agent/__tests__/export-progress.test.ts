import { describe, it, expect } from 'vitest'
import { parseFFmpegTime } from '../tools/export'

describe('parseFFmpegTime', () => {
  it('parses standard time format', () => {
    expect(parseFFmpegTime('time=00:01:30.50')).toBe(90.5)
  })

  it('parses zero time', () => {
    expect(parseFFmpegTime('time=00:00:00.00')).toBe(0)
  })

  it('parses hours', () => {
    expect(parseFFmpegTime('time=01:30:00.00')).toBe(5400)
  })

  it('returns null for non-matching line', () => {
    expect(parseFFmpegTime('frame=1234')).toBeNull()
  })

  it('extracts from full ffmpeg output line', () => {
    const line = 'frame= 1234 fps= 30 q=28.0 size=   12345kB time=00:00:41.23 bitrate=2456.7kbits/s'
    expect(parseFFmpegTime(line)).toBe(41.23)
  })
})
