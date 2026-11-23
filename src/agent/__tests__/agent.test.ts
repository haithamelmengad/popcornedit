import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

// Mock the provider module so we can control LLM responses
vi.mock('../providers', () => ({
  createProvider: vi.fn(),
}))

import { createProvider } from '../providers'
import { runAgent } from '../agent'

const mockCreateProvider = vi.mocked(createProvider)

function makeMockProvider(responses: Array<{ content: string; toolCalls?: any[]; rawContent?: unknown }>) {
  let callIndex = 0
  return {
    name: 'mock',
    chat: vi.fn(),
    chatStream: vi.fn().mockImplementation(async function* () {
      const resp = responses[callIndex] || responses[responses.length - 1]
      callIndex++

      if (resp.content) {
        yield { type: 'text', content: resp.content }
      }

      if (resp.toolCalls) {
        for (const tc of resp.toolCalls) {
          yield { type: 'tool_call_start', toolCall: { id: tc.id, name: tc.name, arguments: '' } }
          yield { type: 'tool_call_delta', toolCall: { id: tc.id, arguments: tc.arguments } }
          yield { type: 'tool_call_end', toolCall: { id: tc.id, name: tc.name, arguments: tc.arguments } }
        }
      }

      yield { type: 'done', rawContent: resp.rawContent }
    }),
  }
}

describe('runAgent', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], isAgentThinking: false, pendingAttachments: [] })
    useSettingsStore.setState({
      providers: { claude: { apiKey: 'test-key', model: 'test-model' } },
      activeProvider: 'claude',
    })
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
    vi.clearAllMocks()
  })

  it('shows error when no API key configured', async () => {
    useSettingsStore.setState({ providers: {}, activeProvider: 'claude' })
    await runAgent('hello')
    const messages = useChatStore.getState().messages
    expect(messages.length).toBeGreaterThanOrEqual(1)
    expect(messages[messages.length - 1].content).toContain('No API key')
  })

  it('sends user message and gets text response', async () => {
    const provider = makeMockProvider([
      { content: 'Hello! I can help you edit your video.' },
    ])
    mockCreateProvider.mockReturnValue(provider as any)

    await runAgent('hello')

    const messages = useChatStore.getState().messages
    // Should have assistant message with the response
    const assistantMsgs = messages.filter((m) => m.role === 'assistant')
    expect(assistantMsgs.length).toBe(1)
    expect(assistantMsgs[0].content).toContain('Hello')
    expect(assistantMsgs[0].isStreaming).toBe(false)
  })

  it('sets and clears agent thinking state', async () => {
    const provider = makeMockProvider([{ content: 'Done.' }])
    mockCreateProvider.mockReturnValue(provider as any)

    // Check thinking state transitions
    const thinkingStates: boolean[] = []
    const unsub = useChatStore.subscribe((state) => {
      thinkingStates.push(state.isAgentThinking)
    })

    await runAgent('test')
    unsub()

    // Should have been set to true then false
    expect(thinkingStates).toContain(true)
    expect(useChatStore.getState().isAgentThinking).toBe(false)
  })

  it('executes tool calls from LLM', async () => {
    // Set up a timeline for get_timeline to report
    const track = useProjectStore.getState().addTrack({
      name: 'Video 1',
      type: 'video',
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: '/test.mp4',
      type: 'video',
      duration: 60,
    })

    const provider = makeMockProvider([
      // First response: call get_timeline
      {
        content: 'Let me check your timeline.',
        toolCalls: [
          {
            id: 'tc1',
            name: 'get_timeline',
            arguments: '{}',
          },
        ],
      },
      // Second response: final text after tool result
      {
        content: 'Your timeline has 1 track.',
      },
    ])
    mockCreateProvider.mockReturnValue(provider as any)

    await runAgent('What does my timeline look like?')

    // Provider should have been called twice (initial + after tool result)
    expect(provider.chatStream).toHaveBeenCalledTimes(2)

    // Assistant message should contain tool result marker
    const assistantMsgs = useChatStore.getState().messages.filter((m) => m.role === 'assistant')
    expect(assistantMsgs.length).toBeGreaterThanOrEqual(1)
  })

  it('sends the user message once when the chat input already stored it', async () => {
    const provider = makeMockProvider([{ content: 'Ok.' }])
    mockCreateProvider.mockReturnValue(provider as any)

    useChatStore.getState().addMessage('user', 'Cut the intro')
    await runAgent('Cut the intro')

    const sent = provider.chatStream.mock.calls[0][0]
    expect(sent.filter((m: any) => m.role === 'user')).toHaveLength(1)
  })

  it('turns empty tool arguments into valid JSON for the next request', async () => {
    const provider = makeMockProvider([
      { content: '', toolCalls: [{ id: 'tc1', name: 'get_timeline', arguments: '' }] },
      { content: 'Your timeline is empty.' },
    ])
    mockCreateProvider.mockReturnValue(provider as any)

    await runAgent('What is on my timeline?')

    const secondRequest = provider.chatStream.mock.calls[1][0]
    const withToolCall = secondRequest.find((m: any) => m.toolCalls)
    expect(withToolCall.toolCalls[0].arguments).toBe('{}')
  })

  it('sends the full assistant turn back on the next request of a tool loop', async () => {
    const rawContent = [
      { type: 'thinking', thinking: '', signature: 'sig-1' },
      { type: 'tool_use', id: 'tc1', name: 'get_timeline', input: {} },
    ]
    const provider = makeMockProvider([
      { content: '', toolCalls: [{ id: 'tc1', name: 'get_timeline', arguments: '{}' }], rawContent },
      { content: 'Your timeline is empty.' },
    ])
    mockCreateProvider.mockReturnValue(provider as any)

    await runAgent('What is on my timeline?')

    const secondRequest = provider.chatStream.mock.calls[1][0]
    expect(secondRequest.find((m: any) => m.toolCalls).rawContent).toBe(rawContent)
  })

  it('does not run tools when the provider stops the turn', async () => {
    const provider = makeMockProvider([{ content: '' }])
    provider.chatStream = vi.fn().mockImplementation(async function* () {
      yield { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'add_track', arguments: '' } }
      yield { type: 'tool_call_end', toolCall: { id: 'tc1', name: 'add_track', arguments: '{"name":"B-roll","type":"video"}' } }
      throw new Error('Claude declined this request.')
    })
    mockCreateProvider.mockReturnValue(provider as any)

    await runAgent('Add a track')

    expect(useProjectStore.getState().timeline.tracks).toHaveLength(0)
    const assistantMsgs = useChatStore.getState().messages.filter((m) => m.role === 'assistant')
    expect(assistantMsgs[0].content).toContain('Claude declined this request.')
  })

  it('handles provider errors gracefully', async () => {
    const provider = makeMockProvider([{ content: '' }])
    provider.chatStream = vi.fn().mockImplementation(async function* () {
      throw new Error('API rate limit exceeded')
    })
    mockCreateProvider.mockReturnValue(provider as any)

    await runAgent('hello')

    const assistantMsgs = useChatStore.getState().messages.filter((m) => m.role === 'assistant')
    expect(assistantMsgs.length).toBe(1)
    expect(assistantMsgs[0].content).toContain('rate limit')
    expect(assistantMsgs[0].isStreaming).toBe(false)
    expect(useChatStore.getState().isAgentThinking).toBe(false)
  })
})
