import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Chat } from '../chat/Chat'
import { useChatStore } from '@/stores/chat'

// Mock the agent so MessageInput submit doesn't trigger real LLM calls
vi.mock('@/agent/agent', () => ({
  runAgent: vi.fn().mockResolvedValue(undefined),
}))

describe('Chat', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isAgentThinking: false,
      pendingAttachments: [],
    })
  })

  it('renders message list and input', () => {
    render(<Chat />)
    // MessageInput has the textarea
    expect(screen.getByPlaceholderText('Describe your edit...')).toBeInTheDocument()
  })

  it('renders empty state when no messages', () => {
    render(<Chat />)
    expect(screen.getByText('Popcorn')).toBeInTheDocument()
    expect(screen.getByText(/Describe what you want to edit/)).toBeInTheDocument()
  })

  it('renders messages when present', () => {
    useChatStore.getState().addMessage('user', 'Cut the intro')
    useChatStore.getState().addMessage('assistant', 'Done!')
    render(<Chat />)
    expect(screen.getByText('Cut the intro')).toBeInTheDocument()
    expect(screen.getByText('Done!')).toBeInTheDocument()
  })

  it('shows send button', () => {
    render(<Chat />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
