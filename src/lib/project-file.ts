/**
 * Project file format (.popcorn) — JSON serialization/deserialization
 * of the project state for save/load.
 */

import type { MediaFile, Timeline } from './types'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'
import { useHistoryStore } from '@/stores/history'
import { useChatStore } from '@/stores/chat'
import { isElectron } from './platform'

const FILE_VERSION = 1
const FILE_EXTENSION = '.popcorn'

export interface ProjectFile {
  version: number
  name: string
  mediaFiles: MediaFile[]
  timeline: Timeline
  playhead: number
  chat: { role: string; content: string; timestamp: number }[]
}

/**
 * Serialize current project state to a ProjectFile object.
 */
export function serializeProject(): ProjectFile {
  const project = useProjectStore.getState()
  const ui = useUIStore.getState()
  const chat = useChatStore.getState()

  return {
    version: FILE_VERSION,
    name: project.name,
    mediaFiles: project.mediaFiles,
    timeline: {
      tracks: project.timeline.tracks,
      duration: project.timeline.duration,
    },
    playhead: ui.playhead,
    chat: chat.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })),
  }
}

/**
 * Restore project state from a ProjectFile object.
 */
export function deserializeProject(data: ProjectFile): void {
  if (!data.version || data.version > FILE_VERSION) {
    throw new Error(`Unsupported project file version: ${data.version}`)
  }

  const projectStore = useProjectStore.getState()
  const uiStore = useUIStore.getState()

  // Restore project
  projectStore.setName(data.name || 'Untitled Project')

  // Clear and restore media files
  useProjectStore.setState({ mediaFiles: data.mediaFiles || [] })

  // Restore timeline
  projectStore.restoreTimeline(data.timeline || { tracks: [], duration: 0 })

  // Restore playhead
  uiStore.setPlayhead(data.playhead || 0)
  uiStore.setDuration(data.timeline?.duration || 0)

  // Restore chat messages
  useChatStore.setState({
    messages: (data.chat || []).map((m, i) => ({
      id: `restored-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
      isStreaming: false,
    })),
  })

  // Clear history (snapshots reference old state)
  useHistoryStore.getState().clear()
}

/**
 * Save project to a JSON file.
 * Electron: uses file dialog. Browser: triggers download.
 */
export async function saveProject(): Promise<string | null> {
  const data = serializeProject()
  const json = JSON.stringify(data, null, 2)
  const filename = `${data.name.replace(/[^a-zA-Z0-9_-]/g, '_')}${FILE_EXTENSION}`

  if (isElectron() && window.electronAPI) {
    // Electron: use save dialog via IPC (would need a new IPC handler)
    // For now, fall through to browser download
  }

  // Browser: trigger download
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  return filename
}

/**
 * Load a project from a .popcorn JSON file.
 * Electron: uses file dialog. Browser: uses file input.
 */
export async function loadProject(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = FILE_EXTENSION + ',.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)

      try {
        const text = await file.text()
        const data = JSON.parse(text) as ProjectFile
        deserializeProject(data)
        resolve(data.name)
      } catch (err) {
        console.error('Failed to load project:', err)
        resolve(null)
      }
    }
    input.click()
  })
}
