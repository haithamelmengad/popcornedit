import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { AgentMessage, FrameAttachment } from '@/lib/types'

interface ChatState {
  messages: AgentMessage[]
  isAgentThinking: boolean
  pendingAttachments: FrameAttachment[]

  addMessage: (role: 'user' | 'assistant', content: string, attachments?: FrameAttachment[]) => AgentMessage
  updateMessage: (id: string, updates: Partial<AgentMessage>) => void
  appendToMessage: (id: string, content: string) => void
  setAgentThinking: (thinking: boolean) => void
  addPendingAttachment: (attachment: FrameAttachment) => void
  removePendingAttachment: (index: number) => void
  clearPendingAttachments: () => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isAgentThinking: false,
  pendingAttachments: [],

  addMessage: (role, content, attachments) => {
    const message: AgentMessage = {
      id: nanoid(),
      role,
      content,
      attachments,
      timestamp: Date.now(),
    }
    set((s) => ({ messages: [...s.messages, message] }))
    return message
  },

  updateMessage: (id, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  appendToMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    })),

  setAgentThinking: (isAgentThinking) => set({ isAgentThinking }),

  addPendingAttachment: (attachment) =>
    set((s) => ({ pendingAttachments: [...s.pendingAttachments, attachment] })),

  removePendingAttachment: (index) =>
    set((s) => ({
      pendingAttachments: s.pendingAttachments.filter((_, i) => i !== index),
    })),

  clearPendingAttachments: () => set({ pendingAttachments: [] }),

  clearMessages: () => set({ messages: [] }),
}))
