import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { useChatStore } from '@/stores/chat'

/**
 * Integration test: View mode toggling
 *
 * Verifies that switching between Simple and Editor views:
 * 1. Preserves all state (playhead, messages, project)
 * 2. View mode toggles correctly
 * 3. Playhead position survives view switch
 */
describe('View mode workflow', () => {
  beforeEach(() => {
    useUIStore.setState({
      viewMode: 'simple',
      playhead: 0,
      isPlaying: false,
      duration: 120,
    })
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useChatStore.setState({
      messages: [],
      isAgentThinking: false,
      pendingAttachments: [],
    })
  })

  it('toggles from simple to editor and back', () => {
    expect(useUIStore.getState().viewMode).toBe('simple')

    useUIStore.getState().setViewMode('editor')
    expect(useUIStore.getState().viewMode).toBe('editor')

    useUIStore.getState().setViewMode('simple')
    expect(useUIStore.getState().viewMode).toBe('simple')
  })

  it('preserves playhead position across view switch', () => {
    useUIStore.getState().setPlayhead(45.5)

    useUIStore.getState().setViewMode('editor')
    expect(useUIStore.getState().playhead).toBe(45.5)

    useUIStore.getState().setViewMode('simple')
    expect(useUIStore.getState().playhead).toBe(45.5)
  })

  it('preserves chat messages across view switch', () => {
    useChatStore.getState().addMessage('user', 'Test message')
    useChatStore.getState().addMessage('assistant', 'Response')

    useUIStore.getState().setViewMode('editor')
    expect(useChatStore.getState().messages).toHaveLength(2)

    useUIStore.getState().setViewMode('simple')
    expect(useChatStore.getState().messages).toHaveLength(2)
    expect(useChatStore.getState().messages[0].content).toBe('Test message')
  })

  it('preserves playing state across view switch', () => {
    useUIStore.getState().setIsPlaying(true)

    useUIStore.getState().setViewMode('editor')
    expect(useUIStore.getState().isPlaying).toBe(true)
  })

  it('preserves project state across view switch', () => {
    const track = useProjectStore.getState().addTrack({
      name: 'Video 1',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })

    useUIStore.getState().setViewMode('editor')
    expect(useProjectStore.getState().timeline.tracks).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[0].id).toBe(track.id)
  })

  it('preserves timeline zoom across view switch', () => {
    useUIStore.getState().setTimelineZoom(200)

    useUIStore.getState().setViewMode('simple')
    useUIStore.getState().setViewMode('editor')

    expect(useUIStore.getState().timelineZoom).toBe(200)
  })
})
