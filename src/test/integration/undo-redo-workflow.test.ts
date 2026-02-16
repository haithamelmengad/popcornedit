import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

/**
 * Integration test: Undo/redo workflow
 *
 * Simulates the full agent edit → undo → redo cycle:
 * 1. Create initial project state
 * 2. Agent makes edits (each creates a history action)
 * 3. Undo restores previous states
 * 4. Redo replays edits
 * 5. New edits after undo discard the redo stack
 */
describe('Undo/redo workflow', () => {
  beforeEach(() => {
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  function setupProject() {
    const track = useProjectStore.getState().addTrack({
      name: 'Video 1',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })

    useProjectStore.getState().addClip(track.id, {
      mediaFileId: 'media-1',
      startInTimeline: 0,
      startInSource: 0,
      endInSource: 120,
      duration: 120,
      speed: 1,
      volume: 1,
    })

    return track.id
  }

  it('full edit → undo → redo cycle', () => {
    const trackId = setupProject()

    // Take initial snapshot
    const snapshot0 = useProjectStore.getState().getTimelineSnapshot()
    expect(snapshot0.tracks[0].clips).toHaveLength(1)
    expect(snapshot0.tracks[0].clips[0].duration).toBe(120)

    // EDIT 1: Trim clip to 60s
    useProjectStore.getState().updateClip(
      trackId,
      useProjectStore.getState().timeline.tracks[0].clips[0].id,
      { endInSource: 60, duration: 60 }
    )
    const snapshot1 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('trim', 'Trim to 60s', snapshot0, snapshot1)

    // EDIT 2: Change speed to 2x
    useProjectStore.getState().updateClip(
      trackId,
      useProjectStore.getState().timeline.tracks[0].clips[0].id,
      { speed: 2 }
    )
    const snapshot2 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('speed', 'Speed 2x', snapshot1, snapshot2)

    // Verify current state
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(60)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].speed).toBe(2)
    expect(useHistoryStore.getState().currentIndex).toBe(1)

    // UNDO: Speed change reverted
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].speed).toBe(1)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(60)
    expect(useHistoryStore.getState().currentIndex).toBe(0)

    // UNDO: Trim reverted
    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(120)
    expect(useHistoryStore.getState().currentIndex).toBe(-1)

    // REDO: Trim re-applied
    useHistoryStore.getState().redo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(60)
    expect(useHistoryStore.getState().currentIndex).toBe(0)

    // REDO: Speed re-applied
    useHistoryStore.getState().redo()
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].speed).toBe(2)
    expect(useHistoryStore.getState().currentIndex).toBe(1)
  })

  it('new edit after undo discards redo stack', () => {
    const trackId = setupProject()

    const s0 = useProjectStore.getState().getTimelineSnapshot()

    // Edit 1
    useProjectStore.getState().updateClip(
      trackId,
      useProjectStore.getState().timeline.tracks[0].clips[0].id,
      { duration: 60, endInSource: 60 }
    )
    const s1 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('trim', 'Trim', s0, s1)

    // Edit 2
    useProjectStore.getState().updateClip(
      trackId,
      useProjectStore.getState().timeline.tracks[0].clips[0].id,
      { speed: 2 }
    )
    const s2 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('speed', 'Speed', s1, s2)

    // Undo both
    useHistoryStore.getState().undo()
    useHistoryStore.getState().undo()
    expect(useHistoryStore.getState().actions).toHaveLength(2)
    expect(useHistoryStore.getState().canRedo()).toBe(true)

    // New edit (diverge from original timeline)
    useProjectStore.getState().updateClip(
      trackId,
      useProjectStore.getState().timeline.tracks[0].clips[0].id,
      { volume: 0.5 }
    )
    const s3 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('volume', 'Volume 50%', s0, s3)

    // Redo stack should be gone
    expect(useHistoryStore.getState().actions).toHaveLength(1)
    expect(useHistoryStore.getState().actions[0].description).toBe('Volume 50%')
    expect(useHistoryStore.getState().canRedo()).toBe(false)
  })

  it('revertTo jumps to a specific point in history', () => {
    const trackId = setupProject()

    const s0 = useProjectStore.getState().getTimelineSnapshot()

    // 3 sequential edits
    useProjectStore.getState().updateClip(trackId, useProjectStore.getState().timeline.tracks[0].clips[0].id, { duration: 90 })
    const s1 = useProjectStore.getState().getTimelineSnapshot()
    const a1 = useHistoryStore.getState().pushAction('trim', 'Trim to 90s', s0, s1)

    useProjectStore.getState().updateClip(trackId, useProjectStore.getState().timeline.tracks[0].clips[0].id, { duration: 60 })
    const s2 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('trim', 'Trim to 60s', s1, s2)

    useProjectStore.getState().updateClip(trackId, useProjectStore.getState().timeline.tracks[0].clips[0].id, { duration: 30 })
    const s3 = useProjectStore.getState().getTimelineSnapshot()
    useHistoryStore.getState().pushAction('trim', 'Trim to 30s', s2, s3)

    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(30)

    // Jump back to action 1
    useHistoryStore.getState().revertTo(a1.id)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(90)
    expect(useHistoryStore.getState().currentIndex).toBe(0)
  })
})
