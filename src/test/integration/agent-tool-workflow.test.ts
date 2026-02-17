import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { useUIStore } from '@/stores/ui'
import { toolRegistry, registerAllTools } from '@/agent/tools'

/**
 * Integration tests: agent tools → project store → history store
 * Tests that the full tool → store → history chain works end-to-end.
 */

function setupProject() {
  const store = useProjectStore.getState()
  const media = store.addMediaFile({
    name: 'video.mp4',
    path: '/video.mp4',
    type: 'video',
    duration: 120,
  })
  const track = store.addTrack({
    name: 'Video 1',
    type: 'video',
    clips: [],
    muted: false,
    volume: 1,
    height: 48,
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
  useUIStore.getState().setDuration(120)
  return { mediaId: media.id, trackId: track.id, clipId: clip.id }
}

describe('Agent tool → store → history integration', () => {
  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
    useUIStore.setState({ selectedClipId: null, playhead: 0, duration: 0 })
    toolRegistry.clear()
    registerAllTools()
  })

  it('split then undo restores original clip', () => {
    const { clipId } = setupProject()

    // Split at 60s
    const result = toolRegistry.execute('split', { clipId, time: 60 })
    expect(result.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(2)
    expect(useHistoryStore.getState().actions).toHaveLength(1)

    // Undo
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(120)
  })

  it('multiple edits then undo each in reverse order', () => {
    const { clipId } = setupProject()

    // Speed up
    toolRegistry.execute('speed', { clipId, speed: 2 })
    const afterSpeed = useProjectStore.getState().timeline.tracks[0].clips[0].duration
    expect(afterSpeed).toBe(60) // 120/2

    // Volume down
    toolRegistry.execute('volume', { clipId, volume: 0.5 })
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].volume).toBe(0.5)

    // Fade in
    toolRegistry.execute('fade_audio', { clipId, fadeIn: 3 })
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].fadeIn).toBe(3)

    expect(useHistoryStore.getState().actions).toHaveLength(3)

    // Undo fade
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].fadeIn).toBeUndefined()

    // Undo volume
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].volume).toBe(1)

    // Undo speed
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(120)
  })

  it('duplicate clip then delete duplicate', () => {
    const { clipId } = setupProject()

    const dupResult = toolRegistry.execute('duplicate_clip', { clipId })
    expect(dupResult.success).toBe(true)
    const newClipId = dupResult.data!.newClipId as string
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(2)

    const delResult = toolRegistry.execute('delete_clip', { clipId: newClipId })
    expect(delResult.success).toBe(true)
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(1)

    expect(useHistoryStore.getState().actions).toHaveLength(2)
  })

  it('add track then move clip to new track', () => {
    const { clipId } = setupProject()

    const trackResult = toolRegistry.execute('add_track', { name: 'Video 2', type: 'video' })
    expect(trackResult.success).toBe(true)
    const newTrackId = trackResult.data!.trackId as string

    const moveResult = toolRegistry.execute('move_clip', {
      clipId,
      newStartInTimeline: 10,
      newTrackId,
    })
    expect(moveResult.success).toBe(true)

    // Original track should be empty, new track should have the clip
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(0)
    expect(useProjectStore.getState().timeline.tracks[1].clips).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[1].clips[0].startInTimeline).toBe(10)
  })

  it('cut range removes section and shifts clips', () => {
    setupProject()

    const result = toolRegistry.execute('cut', { start: 30, end: 60 })
    expect(result.success).toBe(true)

    // Timeline should be shorter by 30s
    const clips = useProjectStore.getState().timeline.tracks[0].clips
    const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0)
    expect(totalDuration).toBeLessThan(120)
  })

  it('get_timeline returns timeline info without modifying state', () => {
    setupProject()
    const snapshotBefore = useProjectStore.getState().getTimelineSnapshot()

    const result = toolRegistry.execute('get_timeline', {})
    expect(result.success).toBe(true)
    expect(result.data?.tracks).toBeDefined()

    // Should not create history action
    expect(useHistoryStore.getState().actions).toHaveLength(0)

    // State unchanged
    const snapshotAfter = useProjectStore.getState().getTimelineSnapshot()
    expect(snapshotAfter).toEqual(snapshotBefore)
  })
})
