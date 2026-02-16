import { describe, it, expect } from 'vitest'
import {
  buildExportCommand,
  buildTrimCommand,
  buildProbeCommand,
  buildFrameExtractCommand,
} from '../ffmpeg'
import type { Timeline } from '../types'

describe('buildExportCommand', () => {
  const makeTimeline = (): Timeline => ({
    tracks: [
      {
        id: 't1',
        name: 'Video 1',
        type: 'video',
        clips: [
          {
            id: 'c1',
            trackId: 't1',
            mediaFileId: 'm1',
            startInTimeline: 0,
            startInSource: 10,
            endInSource: 50,
            duration: 40,
            speed: 1,
            volume: 1,
          },
        ],
        muted: false,
        volume: 1,
        height: 48,
      },
    ],
    duration: 40,
  })

  it('generates input flags for media files', () => {
    const mediaMap = new Map([['m1', '/videos/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.mp4',
    })
    expect(args).toContain('-i')
    expect(args).toContain('/videos/test.mp4')
  })

  it('includes output path as last argument', () => {
    const mediaMap = new Map([['m1', '/videos/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.mp4',
    })
    expect(args[args.length - 1]).toBe('/out.mp4')
  })

  it('includes filter_complex for clips', () => {
    const mediaMap = new Map([['m1', '/videos/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.mp4',
    })
    expect(args).toContain('-filter_complex')
  })

  it('uses libx264 for mp4 format', () => {
    const mediaMap = new Map([['m1', '/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.mp4',
      format: 'mp4',
    })
    expect(args).toContain('libx264')
  })

  it('uses libvpx-vp9 for webm format', () => {
    const mediaMap = new Map([['m1', '/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.webm',
      format: 'webm',
    })
    expect(args).toContain('libvpx-vp9')
  })

  it('applies quality preset', () => {
    const mediaMap = new Map([['m1', '/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.mp4',
      quality: 'high',
    })
    expect(args).toContain('18')  // CRF for high
    expect(args).toContain('slow')
  })

  it('includes fps flag when specified', () => {
    const mediaMap = new Map([['m1', '/test.mp4']])
    const args = buildExportCommand(makeTimeline(), mediaMap, {
      outputPath: '/out.mp4',
      fps: 30,
    })
    expect(args).toContain('-r')
    expect(args).toContain('30')
  })

  it('handles empty timeline', () => {
    const mediaMap = new Map<string, string>()
    const args = buildExportCommand(
      { tracks: [], duration: 0 },
      mediaMap,
      { outputPath: '/out.mp4' }
    )
    expect(args).toContain('-y')
    // No inputs, no filter_complex
    expect(args).not.toContain('-filter_complex')
  })

  it('handles speed changes in filter', () => {
    const timeline: Timeline = {
      tracks: [
        {
          id: 't1',
          name: 'V1',
          type: 'video',
          clips: [
            {
              id: 'c1',
              trackId: 't1',
              mediaFileId: 'm1',
              startInTimeline: 0,
              startInSource: 0,
              endInSource: 60,
              duration: 30,
              speed: 2,
              volume: 1,
            },
          ],
          muted: false,
          volume: 1,
          height: 48,
        },
      ],
      duration: 30,
    }
    const mediaMap = new Map([['m1', '/test.mp4']])
    const args = buildExportCommand(timeline, mediaMap, { outputPath: '/out.mp4' })
    const filterIdx = args.indexOf('-filter_complex')
    const filterStr = args[filterIdx + 1]
    expect(filterStr).toContain('setpts=PTS/2')
    expect(filterStr).toContain('atempo=2')
  })
})

describe('buildTrimCommand', () => {
  it('generates correct trim arguments', () => {
    const args = buildTrimCommand('/in.mp4', '/out.mp4', 10, 30)
    expect(args).toEqual(['-y', '-i', '/in.mp4', '-ss', '10', '-to', '30', '-c', 'copy', '/out.mp4'])
  })
})

describe('buildProbeCommand', () => {
  it('generates correct ffprobe arguments', () => {
    const args = buildProbeCommand('/video.mp4')
    expect(args).toContain('-print_format')
    expect(args).toContain('json')
    expect(args).toContain('/video.mp4')
  })
})

describe('buildFrameExtractCommand', () => {
  it('extracts frame at timestamp', () => {
    const args = buildFrameExtractCommand('/video.mp4', '/frame.jpg', 5.5)
    expect(args).toContain('-ss')
    expect(args).toContain('5.5')
    expect(args).toContain('-vframes')
    expect(args).toContain('1')
    expect(args[args.length - 1]).toBe('/frame.jpg')
  })

  it('includes scale filter when width specified', () => {
    const args = buildFrameExtractCommand('/video.mp4', '/frame.jpg', 5, 320)
    expect(args).toContain('-vf')
    expect(args).toContain('scale=320:-1')
  })
})
