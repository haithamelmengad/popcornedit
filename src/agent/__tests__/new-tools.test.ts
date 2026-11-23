import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { MoveClipTool } from '../tools/move-clip'
import { DuplicateClipTool } from '../tools/duplicate-clip'
import { AddTrackTool } from '../tools/add-track'
import { FadeAudioTool } from '../tools/fade-audio'
import { AnalyzeVideoTool } from '../tools/analyze-video'

function setupTimeline() {
  const store = useProjectStore.getState()
  const track = store.addTrack({
    name: 'Video 1',
    type: 'video',
    clips: [],
    muted: false,
    volume: 1,
    height: 48,
  })
  const media = store.addMediaFile({
    name: 'test.mp4',
    path: '/test.mp4',
    type: 'video',
    duration: 120,
  })
  const clip = store.addClip(track.id, {
    mediaFileId: media.id,
    startInTimeline: 0,
    startInSource: 0,
    endInSource: 120,
    duration: 120,
    speed: 1,
    volume: 1,
  })
  return { trackId: track.id, clipId: clip.id, mediaId: media.id }
}

describe('MoveClipTool', () => {
  const tool = new MoveClipTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('moves clip to new position on same track', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, newStartInTimeline: 30 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].startInTimeline).toBe(30)
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('moves clip to different track', () => {
    const { clipId } = setupTimeline()
    const track2 = useProjectStore.getState().addTrack({
      name: 'Video 2',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })
    const result = tool.execute({ clipId, newStartInTimeline: 10, newTrackId: track2.id })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(0)
    expect(useProjectStore.getState().timeline.tracks[1].clips).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[1].clips[0].startInTimeline).toBe(10)
  })

  it('rejects negative start position', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, newStartInTimeline: -5 })
    expect(result.success).toBe(false)
  })

  it('rejects nonexistent clip', () => {
    setupTimeline()
    const result = tool.execute({ clipId: 'nope', newStartInTimeline: 10 })
    expect(result.success).toBe(false)
  })

  it('rejects nonexistent target track', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, newStartInTimeline: 10, newTrackId: 'nope' })
    expect(result.success).toBe(false)
  })
})

describe('DuplicateClipTool', () => {
  const tool = new DuplicateClipTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('duplicates a clip right after the original', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId })
    expect(result.success).toBe(true)
    expect(result.data?.newClipId).toBeTruthy()

    const clips = useProjectStore.getState().timeline.tracks[0].clips
    expect(clips).toHaveLength(2)
    expect(clips[1].startInTimeline).toBe(120) // right after original (0 + 120)
    expect(clips[1].duration).toBe(120)
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('rejects nonexistent clip', () => {
    setupTimeline()
    const result = tool.execute({ clipId: 'nope' })
    expect(result.success).toBe(false)
  })
})

describe('AddTrackTool', () => {
  const tool = new AddTrackTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('adds a video track', () => {
    const result = tool.execute({ name: 'Video 2', type: 'video' })
    expect(result.success).toBe(true)
    expect(result.data?.trackId).toBeTruthy()
    expect(useProjectStore.getState().timeline.tracks).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[0].type).toBe('video')
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('adds an audio track', () => {
    const result = tool.execute({ name: 'Music', type: 'audio' })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].type).toBe('audio')
  })

  it('rejects empty name', () => {
    const result = tool.execute({ name: '', type: 'video' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = tool.execute({ name: 'Track', type: 'midi' })
    expect(result.success).toBe(false)
  })
})

describe('FadeAudioTool', () => {
  const tool = new FadeAudioTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('sets fade-in on a clip', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, fadeIn: 2 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].fadeIn).toBe(2)
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('sets fade-out on a clip', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, fadeOut: 3 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].fadeOut).toBe(3)
  })

  it('sets both fades', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, fadeIn: 2, fadeOut: 3 })
    expect(result.success).toBe(true)
    const clip = useProjectStore.getState().timeline.tracks[0].clips[0]
    expect(clip.fadeIn).toBe(2)
    expect(clip.fadeOut).toBe(3)
  })

  it('rejects when neither fade specified', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId })
    expect(result.success).toBe(false)
  })

  it('rejects negative fade', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, fadeIn: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects fades exceeding clip duration', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, fadeIn: 100, fadeOut: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects nonexistent clip', () => {
    setupTimeline()
    const result = tool.execute({ clipId: 'nope', fadeIn: 1 })
    expect(result.success).toBe(false)
  })
})

describe('AnalyzeVideoTool', () => {
  const tool = new AnalyzeVideoTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
  })

  it('returns error when no video loaded', () => {
    const result = tool.execute({})
    expect(result.success).toBe(false)
    expect(result.message).toContain('No video')
  })

  it('analyzes full video with defaults', () => {
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: '/test.mp4',
      type: 'video',
      duration: 60,
    })
    const result = tool.execute({})
    expect(result.success).toBe(true)
    expect(result.data?.sampleTimestamps).toBeDefined()
    expect((result.data!.sampleTimestamps as number[]).length).toBe(5)
  })

  it('analyzes a time range', () => {
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: '/test.mp4',
      type: 'video',
      duration: 120,
    })
    const result = tool.execute({ start: 30, end: 60, frameCount: 3 })
    expect(result.success).toBe(true)
    const timestamps = result.data!.sampleTimestamps as number[]
    expect(timestamps.length).toBe(3)
    expect(timestamps[0]).toBeGreaterThanOrEqual(30)
    expect(timestamps[timestamps.length - 1]).toBeLessThanOrEqual(60)
  })

  it('rejects invalid range', () => {
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: '/test.mp4',
      type: 'video',
      duration: 60,
    })
    const result = tool.execute({ start: 50, end: 10 })
    expect(result.success).toBe(false)
  })
})

describe('copies keep fades', () => {
  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('duplicate_clip keeps the fades of the original', () => {
    const { clipId } = setupTimeline()
    new FadeAudioTool().execute({ clipId, fadeIn: 2 })
    const result = new DuplicateClipTool().execute({ clipId })
    const copy = useProjectStore
      .getState()
      .timeline.tracks[0].clips.find((c) => c.id === result.data!.newClipId)
    expect(copy!.fadeIn).toBe(2)
  })

  it('move_clip to another track keeps the fades and returns the new clip ID', () => {
    const { clipId } = setupTimeline()
    new FadeAudioTool().execute({ clipId, fadeOut: 3 })
    const trackId = new AddTrackTool().execute({ name: 'Video 2', type: 'video' }).data!.trackId as string
    const result = new MoveClipTool().execute({ clipId, newStartInTimeline: 5, newTrackId: trackId })
    const moved = useProjectStore.getState().timeline.tracks[1].clips[0]
    expect(moved.fadeOut).toBe(3)
    expect(result.data!.clipId).toBe(moved.id)
  })
})
