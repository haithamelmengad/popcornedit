import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Action, TimelineSnapshot } from '@/lib/types'
import { useProjectStore } from './project'

interface HistoryState {
  actions: Action[]
  currentIndex: number  // -1 = no actions, points to last applied action

  pushAction: (
    type: string,
    description: string,
    snapshotBefore: TimelineSnapshot,
    snapshotAfter: TimelineSnapshot,
    agentMessageId?: string
  ) => Action
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  revertTo: (actionId: string) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  actions: [],
  currentIndex: -1,

  pushAction: (type, description, snapshotBefore, snapshotAfter, agentMessageId) => {
    const action: Action = {
      id: nanoid(),
      type,
      description,
      timestamp: Date.now(),
      agentMessageId,
      snapshotBefore,
      snapshotAfter,
    }
    set((s) => {
      // Discard any future actions if we're not at the end
      const actions = [...s.actions.slice(0, s.currentIndex + 1), action]
      return { actions, currentIndex: actions.length - 1 }
    })
    return action
  },

  undo: () => {
    const { actions, currentIndex } = get()
    if (currentIndex < 0) return
    const action = actions[currentIndex]
    useProjectStore.getState().restoreTimeline(action.snapshotBefore)
    set({ currentIndex: currentIndex - 1 })
  },

  redo: () => {
    const { actions, currentIndex } = get()
    if (currentIndex >= actions.length - 1) return
    const action = actions[currentIndex + 1]
    useProjectStore.getState().restoreTimeline(action.snapshotAfter)
    set({ currentIndex: currentIndex + 1 })
  },

  canUndo: () => get().currentIndex >= 0,

  canRedo: () => get().currentIndex < get().actions.length - 1,

  revertTo: (actionId) => {
    const { actions } = get()
    const index = actions.findIndex((a) => a.id === actionId)
    if (index < 0) return
    const action = actions[index]
    useProjectStore.getState().restoreTimeline(action.snapshotAfter)
    set({ currentIndex: index })
  },

  clear: () => set({ actions: [], currentIndex: -1 }),
}))
