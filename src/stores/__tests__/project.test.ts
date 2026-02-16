import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '../project'

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
      name: 'Untitled Project',
    })
  })

  describe('project metadata', () => {
    it('has default name', () => {
      expect(useProjectStore.getState().name).toBe('Untitled Project')
    })

    it('sets project name', () => {
      useProjectStore.getState().setName('My Video')
      expect(useProjectStore.getState().name).toBe('My Video')
    })
  })

  describe('media files', () => {
    it('adds a media file', () => {
      const file = useProjectStore.getState().addMediaFile({
        name: 'test.mp4',
        path: '/path/test.mp4',
        type: 'video',
        duration: 120,
        width: 1920,
        height: 1080,
      })

      expect(file.id).toBeTruthy()
      expect(file.name).toBe('test.mp4')
      expect(useProjectStore.getState().mediaFiles).toHaveLength(1)
    })

    it('removes a media file', () => {
      const file = useProjectStore.getState().addMediaFile({
        name: 'test.mp4',
        path: '/path/test.mp4',
        type: 'video',
        duration: 120,
      })

      useProjectStore.getState().removeMediaFile(file.id)
      expect(useProjectStore.getState().mediaFiles).toHaveLength(0)
    })
  })

  describe('tracks', () => {
    it('adds a track', () => {
      const track = useProjectStore.getState().addTrack({
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        volume: 1,
        height: 48,
      })

      expect(track.id).toBeTruthy()
      expect(track.name).toBe('Video 1')
      expect(useProjectStore.getState().timeline.tracks).toHaveLength(1)
    })

    it('removes a track', () => {
      const track = useProjectStore.getState().addTrack({
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        volume: 1,
        height: 48,
      })

      useProjectStore.getState().removeTrack(track.id)
      expect(useProjectStore.getState().timeline.tracks).toHaveLength(0)
    })

    it('updates a track', () => {
      const track = useProjectStore.getState().addTrack({
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        volume: 1,
        height: 48,
      })

      useProjectStore.getState().updateTrack(track.id, { muted: true, volume: 0.5 })
      const updated = useProjectStore.getState().timeline.tracks[0]
      expect(updated.muted).toBe(true)
      expect(updated.volume).toBe(0.5)
    })
  })

  describe('clips', () => {
    it('adds a clip to a track', () => {
      const track = useProjectStore.getState().addTrack({
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        volume: 1,
        height: 48,
      })

      const clip = useProjectStore.getState().addClip(track.id, {
        mediaFileId: 'media-1',
        startInTimeline: 0,
        startInSource: 0,
        endInSource: 60,
        duration: 60,
        speed: 1,
        volume: 1,
      })

      expect(clip.id).toBeTruthy()
      expect(clip.trackId).toBe(track.id)
      expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(1)
    })

    it('recalculates duration when clips are added', () => {
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
        startInTimeline: 10,
        startInSource: 0,
        endInSource: 30,
        duration: 30,
        speed: 1,
        volume: 1,
      })

      expect(useProjectStore.getState().timeline.duration).toBe(40) // 10 + 30
    })

    it('removes a clip', () => {
      const track = useProjectStore.getState().addTrack({
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        volume: 1,
        height: 48,
      })

      const clip = useProjectStore.getState().addClip(track.id, {
        mediaFileId: 'media-1',
        startInTimeline: 0,
        startInSource: 0,
        endInSource: 60,
        duration: 60,
        speed: 1,
        volume: 1,
      })

      useProjectStore.getState().removeClip(track.id, clip.id)
      expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(0)
      expect(useProjectStore.getState().timeline.duration).toBe(0)
    })

    it('updates a clip', () => {
      const track = useProjectStore.getState().addTrack({
        name: 'Video 1',
        type: 'video',
        clips: [],
        muted: false,
        volume: 1,
        height: 48,
      })

      const clip = useProjectStore.getState().addClip(track.id, {
        mediaFileId: 'media-1',
        startInTimeline: 0,
        startInSource: 0,
        endInSource: 60,
        duration: 60,
        speed: 1,
        volume: 1,
      })

      useProjectStore.getState().updateClip(track.id, clip.id, { speed: 2, volume: 0.8 })
      const updated = useProjectStore.getState().timeline.tracks[0].clips[0]
      expect(updated.speed).toBe(2)
      expect(updated.volume).toBe(0.8)
    })
  })

  describe('snapshots', () => {
    it('takes and restores a timeline snapshot', () => {
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
        endInSource: 60,
        duration: 60,
        speed: 1,
        volume: 1,
      })

      const snapshot = useProjectStore.getState().getTimelineSnapshot()
      expect(snapshot.tracks).toHaveLength(1)
      expect(snapshot.tracks[0].clips).toHaveLength(1)

      // Modify state
      useProjectStore.getState().removeTrack(track.id)
      expect(useProjectStore.getState().timeline.tracks).toHaveLength(0)

      // Restore
      useProjectStore.getState().restoreTimeline(snapshot)
      expect(useProjectStore.getState().timeline.tracks).toHaveLength(1)
      expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(1)
    })

    it('snapshots are deep copies (mutations do not affect original)', () => {
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
        endInSource: 60,
        duration: 60,
        speed: 1,
        volume: 1,
      })

      const snapshot = useProjectStore.getState().getTimelineSnapshot()

      // Modify the live state
      useProjectStore.getState().updateTrack(track.id, { name: 'Modified' })

      // Snapshot should still have original name
      expect(snapshot.tracks[0].name).toBe('Video 1')
    })
  })
})
