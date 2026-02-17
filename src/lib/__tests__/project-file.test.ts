import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import { useHistoryStore } from '@/stores/history'
import { serializeProject, deserializeProject } from '../project-file'

describe('serializeProject', () => {
  beforeEach(() => {
    useProjectStore.setState({
      name: 'Test Project',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useUIStore.setState({ playhead: 0 })
    useChatStore.setState({ messages: [] })
  })

  it('serializes project state', () => {
    useProjectStore.getState().setName('My Video')
    useUIStore.getState().setPlayhead(15.5)

    const data = serializeProject()
    expect(data.version).toBe(1)
    expect(data.name).toBe('My Video')
    expect(data.playhead).toBe(15.5)
    expect(data.timeline).toBeDefined()
    expect(data.chat).toBeDefined()
  })

  it('serializes media files and timeline', () => {
    const store = useProjectStore.getState()
    const media = store.addMediaFile({
      name: 'test.mp4',
      path: '/test.mp4',
      type: 'video',
      duration: 60,
    })
    const track = store.addTrack({
      name: 'V1',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })
    store.addClip(track.id, {
      mediaFileId: media.id,
      startInTimeline: 0,
      startInSource: 0,
      endInSource: 60,
      duration: 60,
      speed: 1,
      volume: 1,
    })

    const data = serializeProject()
    expect(data.mediaFiles).toHaveLength(1)
    expect(data.timeline.tracks).toHaveLength(1)
    expect(data.timeline.tracks[0].clips).toHaveLength(1)
  })

  it('serializes chat messages', () => {
    useChatStore.getState().addMessage('user', 'Cut the intro')
    useChatStore.getState().addMessage('assistant', 'Done!')

    const data = serializeProject()
    expect(data.chat).toHaveLength(2)
    expect(data.chat[0].role).toBe('user')
    expect(data.chat[0].content).toBe('Cut the intro')
    expect(data.chat[1].role).toBe('assistant')
  })
})

describe('deserializeProject', () => {
  beforeEach(() => {
    useProjectStore.setState({
      name: 'Untitled',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useUIStore.setState({ playhead: 0, duration: 0 })
    useChatStore.setState({ messages: [] })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('restores project name and playhead', () => {
    deserializeProject({
      version: 1,
      name: 'Restored Project',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
      playhead: 42.5,
      chat: [],
    })

    expect(useProjectStore.getState().name).toBe('Restored Project')
    expect(useUIStore.getState().playhead).toBe(42.5)
  })

  it('restores media files', () => {
    deserializeProject({
      version: 1,
      name: 'Test',
      mediaFiles: [
        { id: 'm1', name: 'vid.mp4', path: '/vid.mp4', type: 'video', duration: 90 },
      ],
      timeline: { tracks: [], duration: 0 },
      playhead: 0,
      chat: [],
    })

    expect(useProjectStore.getState().mediaFiles).toHaveLength(1)
    expect(useProjectStore.getState().mediaFiles[0].name).toBe('vid.mp4')
  })

  it('restores timeline with tracks and clips', () => {
    deserializeProject({
      version: 1,
      name: 'Test',
      mediaFiles: [],
      timeline: {
        tracks: [
          {
            id: 't1',
            name: 'Video 1',
            type: 'video',
            clips: [
              {
                id: 'c1',
                trackId: 't1',
                mediaFileId: 'm1',
                startInTimeline: 0,
                startInSource: 0,
                endInSource: 60,
                duration: 60,
                speed: 1,
                volume: 1,
              },
            ],
            muted: false,
            volume: 1,
            height: 48,
          },
        ],
        duration: 60,
      },
      playhead: 0,
      chat: [],
    })

    const timeline = useProjectStore.getState().timeline
    expect(timeline.tracks).toHaveLength(1)
    expect(timeline.tracks[0].clips).toHaveLength(1)
    expect(timeline.duration).toBe(60)
  })

  it('restores chat messages', () => {
    deserializeProject({
      version: 1,
      name: 'Test',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
      playhead: 0,
      chat: [
        { role: 'user', content: 'Hello', timestamp: 1000 },
        { role: 'assistant', content: 'Hi!', timestamp: 1001 },
      ],
    })

    expect(useChatStore.getState().messages).toHaveLength(2)
    expect(useChatStore.getState().messages[0].content).toBe('Hello')
  })

  it('clears history on load', () => {
    useHistoryStore.getState().pushAction(
      'test',
      'test',
      { tracks: [], duration: 0 },
      { tracks: [], duration: 0 }
    )
    expect(useHistoryStore.getState().actions).toHaveLength(1)

    deserializeProject({
      version: 1,
      name: 'Test',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
      playhead: 0,
      chat: [],
    })

    expect(useHistoryStore.getState().actions).toHaveLength(0)
  })

  it('rejects unsupported version', () => {
    expect(() => {
      deserializeProject({
        version: 999,
        name: 'Test',
        mediaFiles: [],
        timeline: { tracks: [], duration: 0 },
        playhead: 0,
        chat: [],
      })
    }).toThrow('Unsupported project file version')
  })

  it('roundtrips correctly', () => {
    // Set up state
    const store = useProjectStore.getState()
    store.setName('Roundtrip Test')
    const media = store.addMediaFile({ name: 'clip.mp4', path: '/clip.mp4', type: 'video', duration: 45 })
    const track = store.addTrack({
      name: 'V1',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })
    store.addClip(track.id, {
      mediaFileId: media.id,
      startInTimeline: 0,
      startInSource: 0,
      endInSource: 45,
      duration: 45,
      speed: 1,
      volume: 1,
    })
    useUIStore.getState().setPlayhead(20)
    useChatStore.getState().addMessage('user', 'Speed it up')

    // Serialize
    const serialized = serializeProject()

    // Reset everything
    useProjectStore.setState({
      name: 'Gone',
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useUIStore.setState({ playhead: 0 })
    useChatStore.setState({ messages: [] })

    // Deserialize
    deserializeProject(serialized)

    // Verify
    expect(useProjectStore.getState().name).toBe('Roundtrip Test')
    expect(useProjectStore.getState().mediaFiles).toHaveLength(1)
    expect(useProjectStore.getState().timeline.tracks).toHaveLength(1)
    expect(useUIStore.getState().playhead).toBe(20)
    expect(useChatStore.getState().messages).toHaveLength(1)
  })
})
