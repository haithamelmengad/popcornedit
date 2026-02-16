import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '../chat/MessageInput'
import { useChatStore } from '@/stores/chat'

describe('MessageInput', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isAgentThinking: false,
      pendingAttachments: [],
    })
  })

  it('renders textarea and send button', () => {
    render(<MessageInput />)
    expect(screen.getByPlaceholderText('Describe your edit...')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2) // attach + send
  })

  it('send button is disabled when input is empty', () => {
    render(<MessageInput />)
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1] // last button is send
    expect(sendButton).toBeDisabled()
  })

  it('send button is disabled when agent is thinking', () => {
    useChatStore.setState({ isAgentThinking: true })
    render(<MessageInput />)
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    expect(sendButton).toBeDisabled()
  })

  it('submits message on send button click', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)

    const textarea = screen.getByPlaceholderText('Describe your edit...')
    await user.type(textarea, 'Cut the intro')

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    await user.click(sendButton)

    expect(useChatStore.getState().messages).toHaveLength(1)
    expect(useChatStore.getState().messages[0].content).toBe('Cut the intro')
    expect(useChatStore.getState().messages[0].role).toBe('user')
  })

  it('clears input after submit', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)

    const textarea = screen.getByPlaceholderText('Describe your edit...')
    await user.type(textarea, 'Speed up')

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    expect(textarea).toHaveValue('')
  })

  it('submits on Enter key', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)

    const textarea = screen.getByPlaceholderText('Describe your edit...')
    await user.type(textarea, 'Trim 5 seconds{Enter}')

    // Message should be submitted (including the placeholder response)
    expect(useChatStore.getState().messages.length).toBeGreaterThanOrEqual(1)
  })

  it('shows pending attachments', () => {
    useChatStore.setState({
      pendingAttachments: [
        { mediaFileId: 'media-1', timestamp: 15, thumbnailUrl: 'data:image/jpeg;base64,thumb1' },
      ],
    })
    render(<MessageInput />)
    const img = screen.getByAltText('Frame at 0:15')
    expect(img).toBeInTheDocument()
  })
})
