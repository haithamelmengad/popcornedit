import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '@/stores/chat'

/**
 * Integration test: Chat message workflow
 *
 * Tests the complete message lifecycle:
 * 1. User types and sends a message
 * 2. Pending attachments are included
 * 3. Agent thinking state is managed
 * 4. Assistant response arrives (streaming simulation)
 */
describe('Chat workflow', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isAgentThinking: false,
      pendingAttachments: [],
    })
  })

  it('complete message flow: user → thinking → assistant response', () => {
    // 1. User sends a message
    const userMsg = useChatStore.getState().addMessage('user', 'Cut from 1:00 to 2:00')
    expect(useChatStore.getState().messages).toHaveLength(1)
    expect(useChatStore.getState().messages[0].role).toBe('user')

    // 2. Agent starts thinking
    useChatStore.getState().setAgentThinking(true)
    expect(useChatStore.getState().isAgentThinking).toBe(true)

    // 3. Agent creates a streaming message
    const assistantMsg = useChatStore.getState().addMessage('assistant', '')
    useChatStore.getState().updateMessage(assistantMsg.id, { isStreaming: true })

    // 4. Content streams in
    useChatStore.getState().appendToMessage(assistantMsg.id, 'I')
    useChatStore.getState().appendToMessage(assistantMsg.id, "'ll cut")
    useChatStore.getState().appendToMessage(assistantMsg.id, ' that section now.')

    // 5. Streaming completes
    useChatStore.getState().updateMessage(assistantMsg.id, { isStreaming: false })
    useChatStore.getState().setAgentThinking(false)

    // Verify final state
    expect(useChatStore.getState().messages).toHaveLength(2)
    expect(useChatStore.getState().messages[1].content).toBe("I'll cut that section now.")
    expect(useChatStore.getState().messages[1].isStreaming).toBe(false)
    expect(useChatStore.getState().isAgentThinking).toBe(false)
  })

  it('message with frame attachment', () => {
    // Add a pending attachment (user captured a frame)
    useChatStore.getState().addPendingAttachment({
      mediaFileId: 'media-1',
      timestamp: 65.5,
      thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQ...',
    })
    expect(useChatStore.getState().pendingAttachments).toHaveLength(1)

    // User sends message — attachments should be included
    const pending = [...useChatStore.getState().pendingAttachments]
    const msg = useChatStore.getState().addMessage('user', 'What is happening at this frame?', pending)
    useChatStore.getState().clearPendingAttachments()

    // Verify
    expect(msg.attachments).toHaveLength(1)
    expect(msg.attachments![0].timestamp).toBe(65.5)
    expect(useChatStore.getState().pendingAttachments).toHaveLength(0)
  })

  it('multiple attachment management', () => {
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
    useChatStore.getState().addPendingAttachment({
      mediaFileId: 'media-1',
      timestamp: 30,
      thumbnailUrl: 'thumb-3',
    })
    expect(useChatStore.getState().pendingAttachments).toHaveLength(3)

    // Remove the middle one
    useChatStore.getState().removePendingAttachment(1)
    expect(useChatStore.getState().pendingAttachments).toHaveLength(2)
    expect(useChatStore.getState().pendingAttachments[0].timestamp).toBe(10)
    expect(useChatStore.getState().pendingAttachments[1].timestamp).toBe(30)
  })
})
