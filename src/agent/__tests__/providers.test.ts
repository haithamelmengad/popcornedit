import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LLMMessage, ToolDefinition } from '../providers/types'

// Mock all three SDKs before importing providers
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(),
        stream: vi.fn(),
      }
      constructor(_opts: any) {}
    },
  }
})

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      }
      constructor(_opts: any) {}
    },
  }
})

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleAI {
      getGenerativeModel = vi.fn()
      constructor(_apiKey: string) {}
    },
  }
})

import { createProvider } from '../providers'
import { ClaudeProvider } from '../providers/claude'
import { OpenAIProvider } from '../providers/openai'
import { GeminiProvider } from '../providers/gemini'

describe('createProvider', () => {
  it('creates a Claude provider', () => {
    const provider = createProvider('claude', { apiKey: 'sk-test', model: 'claude-sonnet-4-5-20250929' })
    expect(provider).toBeInstanceOf(ClaudeProvider)
    expect(provider.name).toBe('claude')
  })

  it('creates an OpenAI provider', () => {
    const provider = createProvider('openai', { apiKey: 'sk-test', model: 'gpt-4o' })
    expect(provider).toBeInstanceOf(OpenAIProvider)
    expect(provider.name).toBe('openai')
  })

  it('creates a Gemini provider', () => {
    const provider = createProvider('gemini', { apiKey: 'key-test', model: 'gemini-2.5-pro' })
    expect(provider).toBeInstanceOf(GeminiProvider)
    expect(provider.name).toBe('gemini')
  })

  it('throws for unknown provider', () => {
    expect(() => createProvider('unknown' as any, { apiKey: 'x', model: 'x' })).toThrow('Unknown provider')
  })
})

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider

  beforeEach(() => {
    provider = new ClaudeProvider('test-key', 'claude-sonnet-4-5-20250929')
  })

  it('has correct name', () => {
    expect(provider.name).toBe('claude')
  })

  it('calls messages.create with formatted messages', async () => {
    const client = (provider as any).client
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Hello!' }],
    })

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
    ]

    const result = await provider.chat(messages)
    expect(result.role).toBe('assistant')
    expect(result.content).toBe('Hello!')
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        system: 'You are helpful.',
        messages: [{ role: 'user', content: 'Hi' }],
      })
    )
  })

  it('parses tool calls from response', async () => {
    const client = (provider as any).client
    client.messages.create.mockResolvedValue({
      content: [
        { type: 'text', text: 'Let me check.' },
        { type: 'tool_use', id: 'tc1', name: 'get_timeline', input: {} },
      ],
    })

    const result = await provider.chat([{ role: 'user', content: 'Show timeline' }])
    expect(result.content).toBe('Let me check.')
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0].name).toBe('get_timeline')
    expect(result.toolCalls![0].id).toBe('tc1')
  })

  it('formats tool results as user messages with tool_result', async () => {
    const client = (provider as any).client
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Done.' }],
    })

    const messages: LLMMessage[] = [
      { role: 'user', content: 'Cut it' },
      { role: 'assistant', content: 'Cutting...', toolCalls: [{ id: 'tc1', name: 'cut', arguments: '{}' }] },
      { role: 'tool', content: 'Cut complete', toolCallId: 'tc1' },
    ]

    await provider.chat(messages)

    const call = client.messages.create.mock.calls[0][0]
    // Tool result should be sent as a user message with tool_result content
    const toolResultMsg = call.messages.find((m: any) =>
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'tool_result')
    )
    expect(toolResultMsg).toBeDefined()
    expect(toolResultMsg.role).toBe('user')
  })

  it('formats assistant messages with tool calls', async () => {
    const client = (provider as any).client
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Ok' }],
    })

    const messages: LLMMessage[] = [
      { role: 'user', content: 'Hi' },
      {
        role: 'assistant',
        content: 'Checking',
        toolCalls: [{ id: 'tc1', name: 'get_timeline', arguments: '{}' }],
      },
      { role: 'tool', content: 'result', toolCallId: 'tc1' },
      { role: 'user', content: 'Ok' },
    ]

    await provider.chat(messages)
    const call = client.messages.create.mock.calls[0][0]
    // Assistant message with tool calls should have content array with text + tool_use
    const assistantMsg = call.messages.find((m: any) => m.role === 'assistant' && Array.isArray(m.content))
    expect(assistantMsg).toBeDefined()
    expect(assistantMsg.content).toHaveLength(2) // text + tool_use
  })

  // A streamed turn the way the SDK gives it: events to iterate, then finalMessage()
  function mockStream(client: any, finalMessage: any, events: any[] = []) {
    client.messages.stream.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield* events
      },
      finalMessage: async () => finalMessage,
    })
  }

  const thinkingTurn = [
    { type: 'thinking', thinking: '', signature: 'sig-1' },
    { type: 'text', text: 'Checking.' },
    { type: 'tool_use', id: 'tc1', name: 'get_timeline', input: {} },
  ]

  it('streams text and tool calls, then hands over the full turn', async () => {
    const client = (provider as any).client
    mockStream(client, { content: thinkingTurn, stop_reason: 'tool_use' }, [
      { type: 'content_block_start', index: 0, content_block: thinkingTurn[0] },
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig-1' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Checking.' } },
      { type: 'content_block_stop', index: 1 },
      { type: 'content_block_start', index: 2, content_block: thinkingTurn[2] },
      { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{}' } },
      { type: 'content_block_stop', index: 2 },
    ])

    const chunks = []
    for await (const chunk of provider.chatStream([{ role: 'user', content: 'Hi' }])) chunks.push(chunk)

    expect(chunks.map((c) => c.type)).toEqual(['text', 'tool_call_start', 'tool_call_delta', 'tool_call_end', 'done'])
    expect(chunks[4].rawContent).toBe(thinkingTurn)
    expect(client.messages.stream.mock.calls[0][0].max_tokens).toBe(64000)
  })

  it('sends a turn with thinking blocks back unchanged', async () => {
    const client = (provider as any).client
    mockStream(client, { content: [{ type: 'text', text: 'Done.' }], stop_reason: 'end_turn' })

    const messages: LLMMessage[] = [
      { role: 'user', content: 'Show timeline' },
      {
        role: 'assistant',
        content: 'Checking.',
        toolCalls: [{ id: 'tc1', name: 'get_timeline', arguments: '{}' }],
        rawContent: thinkingTurn,
      },
      { role: 'tool', content: 'ok', toolCallId: 'tc1' },
    ]
    for await (const _ of provider.chatStream(messages)) {
      // drain
    }

    const sent = client.messages.stream.mock.calls[0][0].messages
    expect(sent[1]).toEqual({ role: 'assistant', content: thinkingTurn })
  })

  it('puts all tool results of one turn in one user message', async () => {
    const client = (provider as any).client
    client.messages.create.mockResolvedValue({ content: [{ type: 'text', text: 'Done.' }] })

    await provider.chat([
      { role: 'user', content: 'Cut both' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'tc1', name: 'cut', arguments: '{}' },
          { id: 'tc2', name: 'cut', arguments: '{}' },
        ],
      },
      { role: 'tool', content: 'one', toolCallId: 'tc1' },
      { role: 'tool', content: 'two', toolCallId: 'tc2' },
    ])

    const sent = client.messages.create.mock.calls[0][0].messages
    expect(sent).toHaveLength(3)
    expect(sent[2].content.map((c: any) => c.tool_use_id)).toEqual(['tc1', 'tc2'])
  })

  it.each([
    ['refusal', 'declined'],
    ['max_tokens', 'cut off'],
  ])('stops with a clear message on stop reason %s', async (stop_reason, text) => {
    const client = (provider as any).client
    mockStream(client, { content: thinkingTurn, stop_reason })

    const run = async () => {
      for await (const _ of provider.chatStream([{ role: 'user', content: 'Hi' }])) {
        // drain
      }
    }
    await expect(run()).rejects.toThrow(text)
  })

  it('passes tools as input_schema format', async () => {
    const client = (provider as any).client
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Hi' }],
    })

    const tools: ToolDefinition[] = [
      { name: 'cut', description: 'Cut video', parameters: { type: 'object', properties: {} } },
    ]

    await provider.chat([{ role: 'user', content: 'Hi' }], tools)
    const call = client.messages.create.mock.calls[0][0]
    expect(call.tools).toHaveLength(1)
    expect(call.tools[0].name).toBe('cut')
    expect(call.tools[0].input_schema).toBeDefined()
  })
})

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    provider = new OpenAIProvider('test-key', 'gpt-4o')
  })

  it('has correct name', () => {
    expect(provider.name).toBe('openai')
  })

  it('calls completions.create with formatted messages', async () => {
    const client = (provider as any).client
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Hello!', tool_calls: null } }],
    })

    const messages: LLMMessage[] = [
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' },
    ]

    const result = await provider.chat(messages)
    expect(result.role).toBe('assistant')
    expect(result.content).toBe('Hello!')
    expect(result.toolCalls).toBeUndefined()
  })

  it('parses tool calls from response', async () => {
    const client = (provider as any).client
    client.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: 'Let me check.',
          tool_calls: [
            { id: 'tc1', type: 'function', function: { name: 'get_timeline', arguments: '{}' } },
          ],
        },
      }],
    })

    const result = await provider.chat([{ role: 'user', content: 'Show timeline' }])
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0].name).toBe('get_timeline')
  })

  it('formats messages correctly for all roles', async () => {
    const client = (provider as any).client
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Ok' } }],
    })

    const messages: LLMMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello', toolCalls: [{ id: 'tc1', name: 'cut', arguments: '{}' }] },
      { role: 'tool', content: 'Done', toolCallId: 'tc1' },
    ]

    await provider.chat(messages)
    const call = client.chat.completions.create.mock.calls[0][0]
    expect(call.messages).toHaveLength(4)
    expect(call.messages[0].role).toBe('system')
    expect(call.messages[1].role).toBe('user')
    expect(call.messages[2].role).toBe('assistant')
    expect(call.messages[2].tool_calls).toHaveLength(1)
    expect(call.messages[3].role).toBe('tool')
    expect(call.messages[3].tool_call_id).toBe('tc1')
  })

  it('ignores the raw content of another provider', async () => {
    const client = (provider as any).client
    client.chat.completions.create.mockResolvedValue({ choices: [{ message: { content: 'Ok' } }] })

    await provider.chat([
      { role: 'user', content: 'Hi' },
      {
        role: 'assistant',
        content: 'Hello',
        toolCalls: [{ id: 'tc1', name: 'cut', arguments: '{}' }],
        rawContent: [{ type: 'thinking', thinking: '', signature: 'sig-1' }],
      },
      { role: 'tool', content: 'Done', toolCallId: 'tc1' },
    ])

    expect(JSON.stringify(client.chat.completions.create.mock.calls[0][0])).not.toContain('sig-1')
  })

  it('passes tools as function type', async () => {
    const client = (provider as any).client
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Hi' } }],
    })

    const tools: ToolDefinition[] = [
      { name: 'cut', description: 'Cut video', parameters: { type: 'object' } },
    ]

    await provider.chat([{ role: 'user', content: 'Hi' }], tools)
    const call = client.chat.completions.create.mock.calls[0][0]
    expect(call.tools[0].type).toBe('function')
    expect(call.tools[0].function.name).toBe('cut')
  })
})

describe('GeminiProvider', () => {
  let provider: GeminiProvider

  beforeEach(() => {
    provider = new GeminiProvider('test-key', 'gemini-2.5-pro')
  })

  it('has correct name', () => {
    expect(provider.name).toBe('gemini')
  })

  it('calls generateContent with formatted contents', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      response: {
        candidates: [{ content: { parts: [{ text: 'Hello!' }] } }],
      },
    })
    const mockGetGenerativeModel = vi.fn().mockReturnValue({ generateContent: mockSendMessage })
    ;(provider as any).client.getGenerativeModel = mockGetGenerativeModel

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
    ]

    const result = await provider.chat(messages)
    expect(result.role).toBe('assistant')
    expect(result.content).toBe('Hello!')
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-pro',
        systemInstruction: 'You are helpful.',
      })
    )
    expect(mockSendMessage).toHaveBeenCalledWith({
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    })
  })

  it('parses function calls from response', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [
              { text: 'Let me check.' },
              { functionCall: { name: 'get_timeline', args: {} } },
            ],
          },
        }],
      },
    })
    ;(provider as any).client.getGenerativeModel = vi.fn().mockReturnValue({ generateContent: mockSendMessage })

    const result = await provider.chat([{ role: 'user', content: 'Show timeline' }])
    expect(result.content).toBe('Let me check.')
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0].name).toBe('get_timeline')
  })

  it('handles tool results in history as functionResponse', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      response: {
        candidates: [{ content: { parts: [{ text: 'Done.' }] } }],
      },
    })
    ;(provider as any).client.getGenerativeModel = vi.fn().mockReturnValue({ generateContent: mockSendMessage })

    const messages: LLMMessage[] = [
      { role: 'user', content: 'Cut it' },
      { role: 'assistant', content: 'Cutting...', toolCalls: [{ id: 'tc1', name: 'cut', arguments: '{}' }] },
      { role: 'tool', content: 'Cut complete', toolCallId: 'tc1' },
      { role: 'user', content: 'Thanks' },
    ]

    await provider.chat(messages)
    const { contents } = mockSendMessage.mock.calls[0][0]
    expect(contents.map((c: any) => c.role)).toEqual(['user', 'model', 'function', 'user'])
    // The result is named after the function that was called
    expect(contents[2].parts[0].functionResponse.name).toBe('cut')
  })

  it('sends the model turn back unchanged, thought signatures included', async () => {
    const turnParts = [
      { text: '', thoughtSignature: 'sig-text' },
      { text: 'Cutting' },
      { text: '...' },
      { functionCall: { name: 'cut', args: { start: 0, end: 5 } }, thoughtSignature: 'sig-call' },
    ]
    const generateContentStream = vi.fn().mockImplementation(async () => ({
      stream: (async function* () {
        yield { candidates: [{ content: { parts: turnParts.slice(0, 2) } }] }
        yield { candidates: [{ content: { parts: turnParts.slice(2) } }] }
      })(),
    }))
    ;(provider as any).client.getGenerativeModel = vi.fn().mockReturnValue({ generateContentStream })

    const messages: LLMMessage[] = [{ role: 'user', content: 'Cut it' }]
    const chunks = []
    for await (const chunk of provider.chatStream(messages)) chunks.push(chunk)
    const done = chunks[chunks.length - 1]
    const call = chunks.find((c) => c.type === 'tool_call_end')!.toolCall!
    expect(done.rawContent).toEqual(turnParts)

    // Next request of the same loop, built the way the agent builds it
    messages.push({
      role: 'assistant',
      content: 'Cutting...',
      toolCalls: [{ id: call.id!, name: call.name!, arguments: call.arguments! }],
      rawContent: done.rawContent,
    })
    messages.push({ role: 'tool', content: 'Cut complete', toolCallId: call.id })
    for await (const _ of provider.chatStream(messages)) {
      // drain
    }

    const { contents } = generateContentStream.mock.calls[1][0]
    expect(contents[1]).toEqual({ role: 'model', parts: turnParts })
    expect(contents[2].parts[0].functionResponse.name).toBe('cut')
  })

  it('keeps the raw parts of a non-streaming reply', async () => {
    const parts = [{ functionCall: { name: 'cut', args: {} }, thoughtSignature: 'sig-call' }]
    const generateContent = vi.fn().mockResolvedValue({ response: { candidates: [{ content: { parts } }] } })
    ;(provider as any).client.getGenerativeModel = vi.fn().mockReturnValue({ generateContent })

    const result = await provider.chat([{ role: 'user', content: 'Cut it' }])
    expect(result.rawContent).toBe(parts)
  })

  it('sends the tool results as the last message when a tool round ends the history', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      response: { candidates: [{ content: { parts: [{ text: 'Done.' }] } }] },
    })
    ;(provider as any).client.getGenerativeModel = vi.fn().mockReturnValue({ generateContent: mockSendMessage })

    await provider.chat([
      { role: 'user', content: 'Cut it twice' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'tc1', name: 'cut', arguments: '{}' },
          { id: 'tc2', name: 'split', arguments: '{}' },
        ],
      },
      { role: 'tool', content: 'ok', toolCallId: 'tc1' },
      { role: 'tool', content: 'ok', toolCallId: 'tc2' },
    ])

    const { contents } = mockSendMessage.mock.calls[0][0]
    const lastTurn = contents[contents.length - 1]
    expect(lastTurn.role).toBe('function')
    expect(lastTurn.parts.map((p: any) => p.functionResponse.name)).toEqual(['cut', 'split'])
  })

  it('passes tools as functionDeclarations', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      response: {
        candidates: [{ content: { parts: [{ text: 'Hi' }] } }],
      },
    })
    ;(provider as any).client.getGenerativeModel = vi.fn().mockReturnValue({ generateContent: mockSendMessage })

    const tools: ToolDefinition[] = [
      { name: 'cut', description: 'Cut video', parameters: { type: 'object' } },
    ]

    await provider.chat([{ role: 'user', content: 'Hi' }], tools)
    const modelOpts = (provider as any).client.getGenerativeModel.mock.calls[0][0]
    expect(modelOpts.tools).toBeDefined()
    expect(modelOpts.tools[0].functionDeclarations[0].name).toBe('cut')
    // No properties: the schema is left out
    expect(modelOpts.tools[0].functionDeclarations[0].parameters).toBeUndefined()
  })
})
