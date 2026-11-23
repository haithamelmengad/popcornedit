import { create } from 'zustand'
import type { ViewMode } from '@/lib/types'

interface UIState {
  viewMode: ViewMode
  playhead: number          // current time in seconds
  isPlaying: boolean
  duration: number          // total video duration
  timelineZoom: number      // pixels per second
  timelineScrollX: number   // horizontal scroll offset
  selectedClipId: string | null
  selectedTrackId: string | null
  settingsOpen: boolean
  isExporting: boolean
  exportProgress: number    // 0-1
  exportError: string | null

  setViewMode: (mode: ViewMode) => void
  setPlayhead: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setDuration: (duration: number) => void
  setTimelineZoom: (zoom: number) => void
  setTimelineScrollX: (x: number) => void
  selectClip: (clipId: string | null) => void
  selectTrack: (trackId: string | null) => void
  setSettingsOpen: (open: boolean) => void
  setExporting: (isExporting: boolean) => void
  setExportProgress: (progress: number) => void
  setExportError: (error: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'simple',
  playhead: 0,
  isPlaying: false,
  duration: 0,
  timelineZoom: 100, // 100px per second default
  timelineScrollX: 0,
  selectedClipId: null,
  selectedTrackId: null,
  settingsOpen: false,
  isExporting: false,
  exportProgress: 0,
  exportError: null,

  setViewMode: (viewMode) => set({ viewMode }),
  setPlayhead: (playhead) => set({ playhead }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setDuration: (duration) => set({ duration }),
  setTimelineZoom: (timelineZoom) => set({ timelineZoom }),
  setTimelineScrollX: (timelineScrollX) => set({ timelineScrollX }),
  selectClip: (selectedClipId) => set({ selectedClipId }),
  selectTrack: (selectedTrackId) => set({ selectedTrackId }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setExporting: (isExporting) => set({ isExporting, exportProgress: 0, exportError: null }),
  setExportProgress: (exportProgress) => set({ exportProgress }),
  setExportError: (exportError) => set({ exportError, isExporting: false }),
}))
