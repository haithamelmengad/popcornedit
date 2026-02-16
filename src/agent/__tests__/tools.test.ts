import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { GetTimelineTool } from '../tools/get-timeline'
import { CutTool } from '../tools/cut'
import { TrimTool } from '../tools/trim'
import { SplitTool } from '../tools/split'
import { SpeedTool } from '../tools/speed'
import { VolumeTool } from '../tools/volume'
import { DeleteClipTool } from '../tools/delete-clip'

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

describe('GetTimelineTool', () => {
  const tool = new GetTimelineTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
  })

  it('reports empty timeline', () => {
    const result = tool.execute({})
    expect(result.success).toBe(true)
    expect(result.message).toContain('empty')
  })

  it('reports tracks and clips', () => {
    setupTimeline()
    const result = tool.execute({})
    expect(result.success).toBe(true)
    expect(result.data?.tracks).toBeDefined()
    expect((result.data!.tracks as any[]).length).toBe(1)
    expect(result.message).toContain('1 track')
  })
})

describe('CutTool', () => {
  const tool = new CutTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('rejects invalid range', () => {
    const result = tool.execute({ start: 30, end: 10 })
    expect(result.success).toBe(false)
  })

  it('cuts a range from a clip', () => {
    setupTimeline()
    const result = tool.execute({ start: 30, end: 60 })
    expect(result.success).toBe(true)
    expect(result.message).toContain('Cut')
    // Timeline duration should be shorter
    expect(useProjectStore.getState().timeline.duration).toBeLessThan(120)
    // History should have one action
    expect(useHistoryStore.getState().actions).toHaveLength(1)
    expect(useHistoryStore.getState().actions[0].type).toBe('cut')
  })

  it('removes clips entirely within cut range', () => {
    const { trackId, mediaId } = setupTimeline()
    // Add a small clip at 10-20
    useProjectStore.getState().removeClip(trackId, useProjectStore.getState().timeline.tracks[0].clips[0].id)
    useProjectStore.getState().addClip(trackId, {
      mediaFileId: mediaId,
      startInTimeline: 10,
      startInSource: 10,
      endInSource: 20,
      duration: 10,
      speed: 1,
      volume: 1,
    })

    const result = tool.execute({ start: 5, end: 25 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(0)
  })
})

describe('TrimTool', () => {
  const tool = new TrimTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('rejects missing both params', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId })
    expect(result.success).toBe(false)
  })

  it('trims from start', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, newStartInSource: 10 })
    expect(result.success).toBe(true)
    const clip = useProjectStore.getState().timeline.tracks[0].clips[0]
    expect(clip.startInSource).toBe(10)
    expect(clip.duration).toBe(110) // 120 - 10
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('trims from end', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, newEndInSource: 100 })
    expect(result.success).toBe(true)
    const clip = useProjectStore.getState().timeline.tracks[0].clips[0]
    expect(clip.endInSource).toBe(100)
    expect(clip.duration).toBe(100)
  })

  it('trims from both ends', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, newStartInSource: 10, newEndInSource: 90 })
    expect(result.success).toBe(true)
    const clip = useProjectStore.getState().timeline.tracks[0].clips[0]
    expect(clip.startInSource).toBe(10)
    expect(clip.endInSource).toBe(90)
    expect(clip.duration).toBe(80)
  })

  it('rejects clip not found', () => {
    setupTimeline()
    const result = tool.execute({ clipId: 'nonexistent', newEndInSource: 60 })
    expect(result.success).toBe(false)
  })
})

describe('SplitTool', () => {
  const tool = new SplitTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('splits a clip at a time point', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, time: 60 })
    expect(result.success).toBe(true)
    expect(result.data?.firstClipId).toBe(clipId)
    expect(result.data?.secondClipId).toBeTruthy()

    const clips = useProjectStore.getState().timeline.tracks[0].clips
    expect(clips).toHaveLength(2)
    expect(clips[0].duration).toBe(60)
    expect(clips[1].duration).toBe(60)
    expect(clips[1].startInTimeline).toBe(60)
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('rejects split outside clip range', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, time: 200 })
    expect(result.success).toBe(false)
  })

  it('rejects split at clip boundary', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, time: 0 })
    expect(result.success).toBe(false)
  })

  it('preserves speed on both resulting clips', () => {
    const { clipId, trackId } = setupTimeline()
    useProjectStore.getState().updateClip(trackId, clipId, { speed: 2 })

    const result = tool.execute({ clipId, time: 30 })
    expect(result.success).toBe(true)
    const clips = useProjectStore.getState().timeline.tracks[0].clips
    expect(clips[0].speed).toBe(2)
    expect(clips[1].speed).toBe(2)
  })
})

describe('SpeedTool', () => {
  const tool = new SpeedTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('changes speed to 2x', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, speed: 2 })
    expect(result.success).toBe(true)
    const clip = useProjectStore.getState().timeline.tracks[0].clips[0]
    expect(clip.speed).toBe(2)
    expect(clip.duration).toBe(60) // 120 source / 2x speed
  })

  it('changes speed to 0.5x', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, speed: 0.5 })
    expect(result.success).toBe(true)
    const clip = useProjectStore.getState().timeline.tracks[0].clips[0]
    expect(clip.speed).toBe(0.5)
    expect(clip.duration).toBe(240) // 120 source / 0.5 speed
  })

  it('rejects invalid speed', () => {
    const { clipId } = setupTimeline()
    expect(tool.execute({ clipId, speed: 0 }).success).toBe(false)
    expect(tool.execute({ clipId, speed: -1 }).success).toBe(false)
  })

  it('creates history action', () => {
    const { clipId } = setupTimeline()
    tool.execute({ clipId, speed: 1.5 })
    expect(useHistoryStore.getState().actions).toHaveLength(1)
    expect(useHistoryStore.getState().actions[0].type).toBe('speed')
  })
})

describe('VolumeTool', () => {
  const tool = new VolumeTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('sets clip volume', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, volume: 0.5 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].volume).toBe(0.5)
  })

  it('sets track volume', () => {
    const { trackId } = setupTimeline()
    const result = tool.execute({ trackId, volume: 0.8 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].volume).toBe(0.8)
  })

  it('rejects missing both clipId and trackId', () => {
    setupTimeline()
    const result = tool.execute({ volume: 0.5 })
    expect(result.success).toBe(false)
  })

  it('rejects negative volume', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId, volume: -0.5 })
    expect(result.success).toBe(false)
  })
})

describe('DeleteClipTool', () => {
  const tool = new DeleteClipTool()

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('deletes a clip', () => {
    const { clipId } = setupTimeline()
    const result = tool.execute({ clipId })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(0)
    expect(useHistoryStore.getState().actions).toHaveLength(1)
  })

  it('rejects clip not found', () => {
    setupTimeline()
    const result = tool.execute({ clipId: 'nonexistent' })
    expect(result.success).toBe(false)
  })
})
