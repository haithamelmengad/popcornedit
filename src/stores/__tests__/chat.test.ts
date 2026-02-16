import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../chat'

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isAgentThinking: false,
      pendingAttachments: [],
    })
  })

  describe('messages', () => {
    it('adds a user message', () => {
      const msg = useChatStore.getState().addMessage('user', 'Cut from 1:00 to 2:00')
      expect(msg.id).toBeTruthy()
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('Cut from 1:00 to 2:00')
      expect(msg.timestamp).toBeGreaterThan(0)
      expect(useChatStore.getState().messages).toHaveLength(1)
    })

    it('adds an assistant message', () => {
      const msg = useChatStore.getState().addMessage('assistant', 'Done, cut applied.')
      expect(msg.role).toBe('assistant')
      expect(useChatStore.getState().messages).toHaveLength(1)
    })

    it('adds message with attachments', () => {
      const attachment = {
        mediaFileId: 'media-1',
        timestamp: 30,
        thumbnailUrl: 'data:image/jpeg;base64,abc',
      }
      const msg = useChatStore.getState().addMessage('user', 'Fix this frame', [attachment])
      expect(msg.attachments).toHaveLength(1)
      expect(msg.attachments![0].timestamp).toBe(30)
    })

    it('preserves message order', () => {
      useChatStore.getState().addMessage('user', 'First')
      useChatStore.getState().addMessage('assistant', 'Second')
      useChatStore.getState().addMessage('user', 'Third')

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('First')
      expect(messages[1].content).toBe('Second')
      expect(messages[2].content).toBe('Third')
    })

    it('updates a message', () => {
      const msg = useChatStore.getState().addMessage('assistant', 'Processing...')
      useChatStore.getState().updateMessage(msg.id, { content: 'Done!', isStreaming: false })

      const updated = useChatStore.getState().messages[0]
      expect(updated.content).toBe('Done!')
      expect(updated.isStreaming).toBe(false)
    })

    it('appends content to a message (streaming)', () => {
      const msg = useChatStore.getState().addMessage('assistant', 'Hello')
      useChatStore.getState().appendToMessage(msg.id, ' world')

      expect(useChatStore.getState().messages[0].content).toBe('Hello world')
    })

    it('clears all messages', () => {
      useChatStore.getState().addMessage('user', 'One')
      useChatStore.getState().addMessage('assistant', 'Two')
      useChatStore.getState().clearMessages()

      expect(useChatStore.getState().messages).toHaveLength(0)
    })
  })

  describe('agent thinking', () => {
    it('sets thinking state', () => {
      useChatStore.getState().setAgentThinking(true)
      expect(useChatStore.getState().isAgentThinking).toBe(true)
    })
  })

  describe('pending attachments', () => {
    it('adds a pending attachment', () => {
      useChatStore.getState().addPendingAttachment({
        mediaFileId: 'media-1',
        timestamp: 10,
        thumbnailUrl: 'data:image/jpeg;base64,abc',
      })
      expect(useChatStore.getState().pendingAttachments).toHaveLength(1)
    })

    it('removes a pending attachment by index', () => {
      useChatStore.getState().addPendingAttachment({
        mediaFileId: 'media-1',
        timestamp: 10,
        thumbnailUrl: 'thumb-1',
      })
      useChatStore.getState().addPendingAttachment({
        mediaFileId: 'media-1',
        timestamp: 20,
        thumbnailUrl: 'thumb-2',
      })

      useChatStore.getState().removePendingAttachment(0)
      expect(useChatStore.getState().pendingAttachments).toHaveLength(1)
      expect(useChatStore.getState().pendingAttachments[0].timestamp).toBe(20)
    })

    it('clears all pending attachments', () => {
      useChatStore.getState().addPendingAttachment({
        mediaFileId: 'media-1',
        timestamp: 10,
        thumbnailUrl: 'thumb-1',
      })
      useChatStore.getState().clearPendingAttachments()
      expect(useChatStore.getState().pendingAttachments).toHaveLength(0)
    })
  })
})
