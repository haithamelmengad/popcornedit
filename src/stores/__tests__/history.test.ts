import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore } from '../history'
import { useProjectStore } from '../project'

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
  })

  const makeSnapshot = (label: string) => ({
    tracks: [{ id: 'track-1', name: label, type: 'video' as const, clips: [], muted: false, volume: 1, height: 48 }],
    duration: 0,
  })

  describe('push action', () => {
    it('adds an action to history', () => {
      const before = makeSnapshot('before')
      const after = makeSnapshot('after')
      const action = useHistoryStore.getState().pushAction('cut', 'Cut 1:00-2:00', before, after)

      expect(action.id).toBeTruthy()
      expect(action.type).toBe('cut')
      expect(action.description).toBe('Cut 1:00-2:00')
      expect(useHistoryStore.getState().actions).toHaveLength(1)
      expect(useHistoryStore.getState().currentIndex).toBe(0)
    })

    it('pushes multiple actions sequentially', () => {
      useHistoryStore.getState().pushAction('cut', 'Action 1', makeSnapshot('s0'), makeSnapshot('s1'))
      useHistoryStore.getState().pushAction('trim', 'Action 2', makeSnapshot('s1'), makeSnapshot('s2'))
      useHistoryStore.getState().pushAction('speed', 'Action 3', makeSnapshot('s2'), makeSnapshot('s3'))

      expect(useHistoryStore.getState().actions).toHaveLength(3)
      expect(useHistoryStore.getState().currentIndex).toBe(2)
    })

    it('discards future actions when pushing after undo', () => {
      useHistoryStore.getState().pushAction('cut', 'A1', makeSnapshot('s0'), makeSnapshot('s1'))
      useHistoryStore.getState().pushAction('trim', 'A2', makeSnapshot('s1'), makeSnapshot('s2'))
      useHistoryStore.getState().pushAction('speed', 'A3', makeSnapshot('s2'), makeSnapshot('s3'))

      // Undo twice
      useHistoryStore.getState().undo()
      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().currentIndex).toBe(0)

      // Push new action — A2 and A3 should be discarded
      useHistoryStore.getState().pushAction('volume', 'A4', makeSnapshot('s1'), makeSnapshot('s4'))
      expect(useHistoryStore.getState().actions).toHaveLength(2)
      expect(useHistoryStore.getState().actions[1].description).toBe('A4')
      expect(useHistoryStore.getState().currentIndex).toBe(1)
    })

    it('stores agent message ID', () => {
      const action = useHistoryStore.getState().pushAction(
        'cut', 'Cut clip', makeSnapshot('a'), makeSnapshot('b'), 'msg-123'
      )
      expect(action.agentMessageId).toBe('msg-123')
    })
  })

  describe('undo', () => {
    it('undoes the last action', () => {
      const before = makeSnapshot('before')
      const after = makeSnapshot('after')
      useHistoryStore.getState().pushAction('cut', 'Cut', before, after)

      // Set project state to "after"
      useProjectStore.getState().restoreTimeline(after)

      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().currentIndex).toBe(-1)
      // Project store should be restored to "before"
      expect(useProjectStore.getState().timeline.tracks[0].name).toBe('before')
    })

    it('does nothing when at beginning', () => {
      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().currentIndex).toBe(-1)
    })

    it('canUndo returns correct state', () => {
      expect(useHistoryStore.getState().canUndo()).toBe(false)

      useHistoryStore.getState().pushAction('cut', 'Cut', makeSnapshot('a'), makeSnapshot('b'))
      expect(useHistoryStore.getState().canUndo()).toBe(true)

      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().canUndo()).toBe(false)
    })
  })

  describe('redo', () => {
    it('redoes the next action', () => {
      const before = makeSnapshot('before')
      const after = makeSnapshot('after')
      useHistoryStore.getState().pushAction('cut', 'Cut', before, after)
      useHistoryStore.getState().undo()

      useHistoryStore.getState().redo()
      expect(useHistoryStore.getState().currentIndex).toBe(0)
      expect(useProjectStore.getState().timeline.tracks[0].name).toBe('after')
    })

    it('does nothing when at end', () => {
      useHistoryStore.getState().pushAction('cut', 'Cut', makeSnapshot('a'), makeSnapshot('b'))
      useHistoryStore.getState().redo() // already at end
      expect(useHistoryStore.getState().currentIndex).toBe(0)
    })

    it('canRedo returns correct state', () => {
      expect(useHistoryStore.getState().canRedo()).toBe(false)

      useHistoryStore.getState().pushAction('cut', 'Cut', makeSnapshot('a'), makeSnapshot('b'))
      expect(useHistoryStore.getState().canRedo()).toBe(false)

      useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().canRedo()).toBe(true)
    })
  })

  describe('revertTo', () => {
    it('reverts to a specific action', () => {
      const a1 = useHistoryStore.getState().pushAction('cut', 'A1', makeSnapshot('s0'), makeSnapshot('s1'))
      useHistoryStore.getState().pushAction('trim', 'A2', makeSnapshot('s1'), makeSnapshot('s2'))
      useHistoryStore.getState().pushAction('speed', 'A3', makeSnapshot('s2'), makeSnapshot('s3'))

      useHistoryStore.getState().revertTo(a1.id)
      expect(useHistoryStore.getState().currentIndex).toBe(0)
      expect(useProjectStore.getState().timeline.tracks[0].name).toBe('s1')
    })

    it('ignores invalid action ID', () => {
      useHistoryStore.getState().pushAction('cut', 'A1', makeSnapshot('s0'), makeSnapshot('s1'))
      useHistoryStore.getState().revertTo('nonexistent')
      expect(useHistoryStore.getState().currentIndex).toBe(0) // unchanged
    })
  })

  describe('clear', () => {
    it('clears all history', () => {
      useHistoryStore.getState().pushAction('cut', 'A1', makeSnapshot('a'), makeSnapshot('b'))
      useHistoryStore.getState().pushAction('trim', 'A2', makeSnapshot('b'), makeSnapshot('c'))

      useHistoryStore.getState().clear()
      expect(useHistoryStore.getState().actions).toHaveLength(0)
      expect(useHistoryStore.getState().currentIndex).toBe(-1)
    })
  })
})
