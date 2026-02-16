// ============================================================
// Core data types for CutAgent
// ============================================================

export interface MediaFile {
  id: string
  name: string
  path: string        // file path or blob URL
  type: 'video' | 'audio'
  duration: number    // seconds
  width?: number
  height?: number
  fps?: number
  thumbnailUrl?: string
}

export interface Project {
  id: string
  name: string
  mediaFiles: MediaFile[]
  timeline: Timeline
}

export interface Timeline {
  tracks: Track[]
  duration: number  // total duration in seconds
}

export interface Track {
  id: string
  name: string
  type: 'video' | 'audio'
  clips: Clip[]
  muted: boolean
  volume: number    // 0-1
  height: number    // track height in pixels (for UI)
}

export interface Clip {
  id: string
  trackId: string
  mediaFileId: string
  startInTimeline: number   // where clip starts on timeline (seconds)
  startInSource: number     // trim: where in source media to start
  endInSource: number       // trim: where in source media to end
  duration: number          // clip length on timeline
  speed: number             // playback speed multiplier
  volume: number            // audio volume multiplier
  color?: string            // clip color in timeline
}

export interface Action {
  id: string
  type: string              // 'cut' | 'split' | 'trim' | 'speed' | etc.
  description: string       // human-readable
  timestamp: number
  agentMessageId?: string
  snapshotBefore: TimelineSnapshot
  snapshotAfter: TimelineSnapshot
}

export interface TimelineSnapshot {
  tracks: Track[]
  duration: number
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: FrameAttachment[]
  actionIds?: string[]
  timestamp: number
  isStreaming?: boolean
}

export interface FrameAttachment {
  mediaFileId: string
  timestamp: number         // frame time in video
  thumbnailUrl: string      // data URL or blob URL
}

export type ViewMode = 'simple' | 'editor'

export type ProviderType = 'claude' | 'openai' | 'gemini'

export interface ProviderConfig {
  apiKey: string
  model: string
}

export interface Settings {
  providers: Partial<Record<ProviderType, ProviderConfig>>
  activeProvider: ProviderType
}
