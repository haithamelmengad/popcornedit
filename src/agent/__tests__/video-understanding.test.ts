import { describe, it, expect } from 'vitest'
import { generateSampleTimestamps } from '../video-understanding/frame-sampler'
import { searchTranscript, getTranscriptInRange, type Transcript } from '../video-understanding/transcript'
import { buildVideoIndex, formatIndexForLLM } from '../video-understanding/indexer'

describe('generateSampleTimestamps', () => {
  it('generates evenly spaced timestamps', () => {
    const ts = generateSampleTimestamps(100, 5)
    expect(ts).toEqual([0, 25, 50, 75, 100])
  })

  it('single sample returns midpoint', () => {
    const ts = generateSampleTimestamps(100, 1)
    expect(ts).toEqual([50])
  })

  it('returns empty for zero count', () => {
    expect(generateSampleTimestamps(100, 0)).toEqual([])
  })

  it('respects start and end range', () => {
    const ts = generateSampleTimestamps(100, 3, 20, 80)
    expect(ts).toEqual([20, 50, 80])
  })

  it('returns empty when start >= end', () => {
    expect(generateSampleTimestamps(100, 5, 50, 50)).toEqual([])
  })
})

describe('searchTranscript', () => {
  const transcript: Transcript = {
    segments: [
      { text: 'Hello world', start: 0, end: 2 },
      { text: 'Testing one two three', start: 2, end: 5 },
      { text: 'Hello again', start: 5, end: 7 },
    ],
    fullText: '',
  }

  it('finds matching segments', () => {
    const results = searchTranscript(transcript, 'hello')
    expect(results).toHaveLength(2)
  })

  it('is case insensitive', () => {
    const results = searchTranscript(transcript, 'HELLO')
    expect(results).toHaveLength(2)
  })

  it('returns empty for no match', () => {
    const results = searchTranscript(transcript, 'xyz')
    expect(results).toHaveLength(0)
  })
})

describe('getTranscriptInRange', () => {
  const transcript: Transcript = {
    segments: [
      { text: 'Seg 1', start: 0, end: 3 },
      { text: 'Seg 2', start: 3, end: 6 },
      { text: 'Seg 3', start: 6, end: 9 },
      { text: 'Seg 4', start: 9, end: 12 },
    ],
    fullText: '',
  }

  it('returns segments overlapping range', () => {
    const results = getTranscriptInRange(transcript, 2, 7)
    expect(results).toHaveLength(3) // Seg 1 (ends at 3), Seg 2, Seg 3 (starts at 6)
  })

  it('returns empty for out-of-range query', () => {
    const results = getTranscriptInRange(transcript, 100, 200)
    expect(results).toHaveLength(0)
  })
})

describe('buildVideoIndex', () => {
  it('creates scenes from duration', () => {
    const index = buildVideoIndex(
      'media-1',
      120,
      [
        { timestamp: 30, dataUrl: '', width: 320, height: 180 },
        { timestamp: 90, dataUrl: '', width: 320, height: 180 },
      ],
      { segments: [], fullText: '' }
    )
    expect(index.mediaFileId).toBe('media-1')
    expect(index.duration).toBe(120)
    expect(index.scenes.length).toBe(4) // 120/30 = 4 scenes
  })

  it('assigns closest keyframe to each scene', () => {
    const index = buildVideoIndex(
      'media-1',
      60,
      [
        { timestamp: 15, dataUrl: 'frame1', width: 320, height: 180 },
        { timestamp: 45, dataUrl: 'frame2', width: 320, height: 180 },
      ],
      { segments: [], fullText: '' }
    )
    expect(index.scenes[0].keyframe?.dataUrl).toBe('frame1')
    expect(index.scenes[1].keyframe?.dataUrl).toBe('frame2')
  })
})

describe('formatIndexForLLM', () => {
  it('produces readable output', () => {
    const index = buildVideoIndex(
      'media-1',
      60,
      [],
      {
        segments: [
          { text: 'Hello', start: 0, end: 5 },
          { text: 'World', start: 35, end: 40 },
        ],
        fullText: '',
      }
    )
    const output = formatIndexForLLM(index)
    expect(output).toContain('Video duration: 60.0s')
    expect(output).toContain('Scenes:')
    expect(output).toContain('Transcript:')
    expect(output).toContain('Hello')
  })
})
