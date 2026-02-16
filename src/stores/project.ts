import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { MediaFile, Timeline, Track, Clip } from '@/lib/types'

interface ProjectState {
  id: string
  name: string
  mediaFiles: MediaFile[]
  timeline: Timeline

  // Actions
  setName: (name: string) => void
  addMediaFile: (file: Omit<MediaFile, 'id'>) => MediaFile
  removeMediaFile: (id: string) => void
  setTimeline: (timeline: Timeline) => void
  addTrack: (track: Omit<Track, 'id'>) => Track
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId'>) => Clip
  removeClip: (trackId: string, clipId: string) => void
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void
  getTimelineSnapshot: () => { tracks: Track[]; duration: number }
  restoreTimeline: (snapshot: { tracks: Track[]; duration: number }) => void
  recalcDuration: () => void
}

function calcDuration(tracks: Track[]): number {
  let max = 0
  for (const track of tracks) {
    for (const clip of track.clips) {
      const end = clip.startInTimeline + clip.duration
      if (end > max) max = end
    }
  }
  return max
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  id: nanoid(),
  name: 'Untitled Project',
  mediaFiles: [],
  timeline: { tracks: [], duration: 0 },

  setName: (name) => set({ name }),

  addMediaFile: (file) => {
    const newFile: MediaFile = { ...file, id: nanoid() }
    set((s) => ({ mediaFiles: [...s.mediaFiles, newFile] }))
    return newFile
  },

  removeMediaFile: (id) =>
    set((s) => ({ mediaFiles: s.mediaFiles.filter((f) => f.id !== id) })),

  setTimeline: (timeline) => set({ timeline }),

  addTrack: (trackData) => {
    const track: Track = { ...trackData, id: nanoid() }
    set((s) => ({
      timeline: {
        ...s.timeline,
        tracks: [...s.timeline.tracks, track],
      },
    }))
    return track
  },

  removeTrack: (id) =>
    set((s) => ({
      timeline: {
        ...s.timeline,
        tracks: s.timeline.tracks.filter((t) => t.id !== id),
        duration: calcDuration(s.timeline.tracks.filter((t) => t.id !== id)),
      },
    })),

  updateTrack: (id, updates) =>
    set((s) => ({
      timeline: {
        ...s.timeline,
        tracks: s.timeline.tracks.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      },
    })),

  addClip: (trackId, clipData) => {
    const clip: Clip = { ...clipData, id: nanoid(), trackId }
    set((s) => {
      const tracks = s.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
      )
      return {
        timeline: { tracks, duration: calcDuration(tracks) },
      }
    })
    return clip
  },

  removeClip: (trackId, clipId) =>
    set((s) => {
      const tracks = s.timeline.tracks.map((t) =>
        t.id === trackId
          ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
          : t
      )
      return {
        timeline: { tracks, duration: calcDuration(tracks) },
      }
    }),

  updateClip: (trackId, clipId, updates) =>
    set((s) => {
      const tracks = s.timeline.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              clips: t.clips.map((c) =>
                c.id === clipId ? { ...c, ...updates } : c
              ),
            }
          : t
      )
      return {
        timeline: { tracks, duration: calcDuration(tracks) },
      }
    }),

  getTimelineSnapshot: () => {
    const { timeline } = get()
    return JSON.parse(JSON.stringify({ tracks: timeline.tracks, duration: timeline.duration }))
  },

  restoreTimeline: (snapshot) =>
    set({ timeline: { tracks: snapshot.tracks, duration: snapshot.duration } }),

  recalcDuration: () =>
    set((s) => ({
      timeline: {
        ...s.timeline,
        duration: calcDuration(s.timeline.tracks),
      },
    })),
}))
