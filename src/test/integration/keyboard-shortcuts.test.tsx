import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import App from '@/App'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

/**
 * Integration test: keyboard shortcuts on a selected clip
 *
 * Verifies that Delete and Cmd+D act on the selected clip and can be undone.
 */
describe('Keyboard shortcuts', () => {
  let clipId: string
  const clips = () => useProjectStore.getState().timeline.tracks[0].clips

  beforeEach(() => {
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
    const store = useProjectStore.getState()
    const track = store.addTrack({ name: 'Video 1', type: 'video', clips: [], muted: false, volume: 1, height: 48 })
    clipId = store.addClip(track.id, {
      mediaFileId: 'm1',
      startInTimeline: 0,
      startInSource: 0,
      endInSource: 10,
      duration: 10,
      speed: 1,
      volume: 1,
    }).id
    useUIStore.setState({ selectedClipId: clipId })
    render(<App />)
  })

  it('Delete removes the selected clip and Cmd+Z brings it back', () => {
    fireEvent.keyDown(document.body, { key: 'Delete' })
    expect(clips()).toHaveLength(0)
    expect(useUIStore.getState().selectedClipId).toBeNull()

    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(clips()).toHaveLength(1)
  })

  it('Cmd+D duplicates the selected clip', () => {
    fireEvent.keyDown(document.body, { key: 'd', metaKey: true })
    expect(clips()).toHaveLength(2)
  })
})
