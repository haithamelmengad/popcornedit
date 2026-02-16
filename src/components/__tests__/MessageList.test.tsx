import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from '../chat/MessageList'
import { useChatStore } from '@/stores/chat'

describe('MessageList', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isAgentThinking: false,
      pendingAttachments: [],
    })
  })

  it('shows empty state when no messages', () => {
    render(<MessageList />)
    expect(screen.getByText('Popcorn')).toBeInTheDocument()
    expect(screen.getByText(/Describe what you want to edit/)).toBeInTheDocument()
  })

  it('renders user messages', () => {
    useChatStore.getState().addMessage('user', 'Cut from 1:00 to 2:00')
    render(<MessageList />)
    expect(screen.getByText('Cut from 1:00 to 2:00')).toBeInTheDocument()
  })

  it('renders assistant messages', () => {
    useChatStore.getState().addMessage('assistant', 'Done, cut applied at 1:00.')
    render(<MessageList />)
    expect(screen.getByText('Done, cut applied at 1:00.')).toBeInTheDocument()
  })

  it('renders multiple messages in order', () => {
    useChatStore.getState().addMessage('user', 'First message')
    useChatStore.getState().addMessage('assistant', 'Second message')
    useChatStore.getState().addMessage('user', 'Third message')
    render(<MessageList />)

    const messages = screen.getAllByText(/message/)
    expect(messages).toHaveLength(3)
  })

  it('shows loading indicator when agent is thinking', () => {
    useChatStore.setState({ isAgentThinking: true })
    render(<MessageList />)
    // The loader is an SVG with animate-spin class — check it's rendered
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('does not show empty state when messages exist', () => {
    useChatStore.getState().addMessage('user', 'Hello')
    render(<MessageList />)
    expect(screen.queryByText('Popcorn')).not.toBeInTheDocument()
  })

  it('renders messages with attachments', () => {
    useChatStore.getState().addMessage('user', 'Fix this frame', [
      {
        mediaFileId: 'media-1',
        timestamp: 30,
        thumbnailUrl: 'data:image/jpeg;base64,abc',
      },
    ])
    render(<MessageList />)
    expect(screen.getByText('Fix this frame')).toBeInTheDocument()
    const img = screen.getByAltText('Frame at 0:30')
    expect(img).toBeInTheDocument()
  })
})
