import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      viewMode: 'simple',
      playhead: 0,
      isPlaying: false,
      duration: 0,
      timelineZoom: 100,
      timelineScrollX: 0,
      selectedClipId: null,
      selectedTrackId: null,
      settingsOpen: false,
      isExporting: false,
      exportProgress: 0,
      exportError: null,
    })
  })

  describe('view mode', () => {
    it('defaults to simple', () => {
      expect(useUIStore.getState().viewMode).toBe('simple')
    })

    it('toggles to editor', () => {
      useUIStore.getState().setViewMode('editor')
      expect(useUIStore.getState().viewMode).toBe('editor')
    })

    it('toggles back to simple', () => {
      useUIStore.getState().setViewMode('editor')
      useUIStore.getState().setViewMode('simple')
      expect(useUIStore.getState().viewMode).toBe('simple')
    })
  })

  describe('playback', () => {
    it('sets playhead position', () => {
      useUIStore.getState().setPlayhead(42.5)
      expect(useUIStore.getState().playhead).toBe(42.5)
    })

    it('sets playing state', () => {
      useUIStore.getState().setIsPlaying(true)
      expect(useUIStore.getState().isPlaying).toBe(true)
    })

    it('sets duration', () => {
      useUIStore.getState().setDuration(120.5)
      expect(useUIStore.getState().duration).toBe(120.5)
    })
  })

  describe('timeline', () => {
    it('sets zoom level', () => {
      useUIStore.getState().setTimelineZoom(200)
      expect(useUIStore.getState().timelineZoom).toBe(200)
    })

    it('sets scroll position', () => {
      useUIStore.getState().setTimelineScrollX(500)
      expect(useUIStore.getState().timelineScrollX).toBe(500)
    })
  })

  describe('selection', () => {
    it('selects a clip', () => {
      useUIStore.getState().selectClip('clip-1')
      expect(useUIStore.getState().selectedClipId).toBe('clip-1')
    })

    it('deselects a clip', () => {
      useUIStore.getState().selectClip('clip-1')
      useUIStore.getState().selectClip(null)
      expect(useUIStore.getState().selectedClipId).toBeNull()
    })

    it('selects a track', () => {
      useUIStore.getState().selectTrack('track-1')
      expect(useUIStore.getState().selectedTrackId).toBe('track-1')
    })
  })

  describe('settings', () => {
    it('opens settings', () => {
      useUIStore.getState().setSettingsOpen(true)
      expect(useUIStore.getState().settingsOpen).toBe(true)
    })

    it('closes settings', () => {
      useUIStore.getState().setSettingsOpen(true)
      useUIStore.getState().setSettingsOpen(false)
      expect(useUIStore.getState().settingsOpen).toBe(false)
    })
  })

  describe('export', () => {
    it('sets exporting state', () => {
      useUIStore.getState().setExporting(true)
      expect(useUIStore.getState().isExporting).toBe(true)
      expect(useUIStore.getState().exportProgress).toBe(0)
      expect(useUIStore.getState().exportError).toBeNull()
    })

    it('sets export progress', () => {
      useUIStore.getState().setExporting(true)
      useUIStore.getState().setExportProgress(0.5)
      expect(useUIStore.getState().exportProgress).toBe(0.5)
    })

    it('sets export error and clears exporting', () => {
      useUIStore.getState().setExporting(true)
      useUIStore.getState().setExportError('Something went wrong')
      expect(useUIStore.getState().exportError).toBe('Something went wrong')
      expect(useUIStore.getState().isExporting).toBe(false)
    })

    it('clears error when starting new export', () => {
      useUIStore.getState().setExportError('old error')
      useUIStore.getState().setExporting(true)
      expect(useUIStore.getState().exportError).toBeNull()
    })
  })
})
