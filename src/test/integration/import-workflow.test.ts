import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'

/**
 * Integration test: Import video workflow
 *
 * Simulates what happens when a user imports a video file:
 * 1. MediaFile is added to project store
 * 2. A default track + clip are created
 * 3. UI duration is updated
 * 4. Timeline reflects the new clip
 */
describe('Import workflow', () => {
  beforeEach(() => {
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useUIStore.setState({ playhead: 0, duration: 0 })
  })

  it('creates media file, track, and clip on import', () => {
    // Simulate the import flow from Header.tsx
    const mediaFile = useProjectStore.getState().addMediaFile({
      name: 'demo.mp4',
      path: 'blob:http://localhost/abc',
      type: 'video',
      duration: 225.3,
      width: 1920,
      height: 1080,
    })

    const track = useProjectStore.getState().addTrack({
      name: 'Video 1',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })

    const clip = useProjectStore.getState().addClip(track.id, {
      mediaFileId: mediaFile.id,
      startInTimeline: 0,
      startInSource: 0,
      endInSource: 225.3,
      duration: 225.3,
      speed: 1,
      volume: 1,
    })

    useUIStore.getState().setDuration(225.3)

    // Verify everything is connected
    expect(useProjectStore.getState().mediaFiles).toHaveLength(1)
    expect(useProjectStore.getState().mediaFiles[0].id).toBe(mediaFile.id)

    expect(useProjectStore.getState().timeline.tracks).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].mediaFileId).toBe(mediaFile.id)

    expect(useProjectStore.getState().timeline.duration).toBe(225.3)
    expect(useUIStore.getState().duration).toBe(225.3)
  })

  it('handles multiple media file imports', () => {
    const file1 = useProjectStore.getState().addMediaFile({
      name: 'video1.mp4',
      path: '/path/video1.mp4',
      type: 'video',
      duration: 60,
    })

    const file2 = useProjectStore.getState().addMediaFile({
      name: 'audio1.wav',
      path: '/path/audio1.wav',
      type: 'audio',
      duration: 120,
    })

    expect(useProjectStore.getState().mediaFiles).toHaveLength(2)
    expect(useProjectStore.getState().mediaFiles[0].type).toBe('video')
    expect(useProjectStore.getState().mediaFiles[1].type).toBe('audio')
  })
})
