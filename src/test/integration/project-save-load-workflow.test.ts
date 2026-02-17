import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import { useHistoryStore } from '@/stores/history'
import { serializeProject, deserializeProject } from '@/lib/project-file'
import { toolRegistry, registerAllTools } from '@/agent/tools'

/**
 * Integration tests: project save → edit → load → verify state restored
 */

describe('Project save/load workflow', () => {
  beforeEach(() => {
    useProjectStore.setState({
      name: 'Untitled',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useUIStore.setState({ playhead: 0, duration: 0 })
    useChatStore.setState({ messages: [], isAgentThinking: false, pendingAttachments: [] })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
    toolRegistry.clear()
    registerAllTools()
  })

  it('saves project, makes edits, loads project to restore original state', () => {
    // Set up initial project
    const store = useProjectStore.getState()
    store.setName('Test Project')
    const media = store.addMediaFile({
      name: 'clip.mp4',
      path: '/clip.mp4',
      type: 'video',
      duration: 90,
    })
    const track = store.addTrack({
      name: 'V1',
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
      endInSource: 90,
      duration: 90,
      speed: 1,
      volume: 1,
    })
    useUIStore.getState().setPlayhead(30)
    useChatStore.getState().addMessage('user', 'Speed up the video')

    // Save
    const savedData = serializeProject()
    expect(savedData.name).toBe('Test Project')
    expect(savedData.timeline.tracks[0].clips).toHaveLength(1)

    // Make destructive edits
    toolRegistry.execute('speed', { clipId: clip.id, speed: 3 })
    toolRegistry.execute('delete_clip', { clipId: clip.id })
    useProjectStore.getState().setName('Ruined Project')
    useUIStore.getState().setPlayhead(0)

    // Verify edits happened
    expect(useProjectStore.getState().name).toBe('Ruined Project')
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(0)

    // Load saved project
    deserializeProject(savedData)

    // Verify restoration
    expect(useProjectStore.getState().name).toBe('Test Project')
    expect(useProjectStore.getState().timeline.tracks[0].clips).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks[0].clips[0].duration).toBe(90)
    expect(useUIStore.getState().playhead).toBe(30)
    expect(useChatStore.getState().messages).toHaveLength(1)
    expect(useChatStore.getState().messages[0].content).toBe('Speed up the video')

    // History should be cleared after load
    expect(useHistoryStore.getState().actions).toHaveLength(0)
  })

  it('preserves media file metadata through save/load', () => {
    const store = useProjectStore.getState()
    store.addMediaFile({
      name: 'footage.mov',
      path: '/footage.mov',
      type: 'video',
      duration: 300,
      width: 1920,
      height: 1080,
      fps: 30,
    })

    const saved = serializeProject()
    useProjectStore.setState({ mediaFiles: [] })

    deserializeProject(saved)

    const restored = useProjectStore.getState().mediaFiles[0]
    expect(restored.name).toBe('footage.mov')
    expect(restored.duration).toBe(300)
    expect(restored.width).toBe(1920)
    expect(restored.height).toBe(1080)
    expect(restored.fps).toBe(30)
  })

  it('preserves multiple chat messages through save/load', () => {
    useChatStore.getState().addMessage('user', 'First message')
    useChatStore.getState().addMessage('assistant', 'Response 1')
    useChatStore.getState().addMessage('user', 'Second message')
    useChatStore.getState().addMessage('assistant', 'Response 2')

    const saved = serializeProject()
    useChatStore.setState({ messages: [] })

    deserializeProject(saved)

    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(4)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('First message')
    expect(messages[3].role).toBe('assistant')
    expect(messages[3].content).toBe('Response 2')
  })
})
