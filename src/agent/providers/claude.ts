import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, LLMMessage, ToolDefinition, StreamChunk, ToolCall } from './types'

export class ClaudeProvider implements LLMProvider {
  name = 'claude'
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    this.model = model
  }

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
    const { system, msgs } = this.formatMessages(messages)

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: system || undefined,
      messages: msgs,
      tools: tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
    })

    this.checkStopReason(response)
    return this.parseResponse(response)
  }

  async *chatStream(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const { system, msgs } = this.formatMessages(messages)

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 64000,
      system: system || undefined,
      messages: msgs,
      tools: tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
    })

    let currentToolCall: Partial<ToolCall> | null = null

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block
        if (block.type === 'text') {
          // Text block starting — nothing to yield yet
        } else if (block.type === 'tool_use') {
          currentToolCall = { id: block.id, name: block.name, arguments: '' }
          yield { type: 'tool_call_start', toolCall: currentToolCall }
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta
        if (delta.type === 'text_delta') {
          yield { type: 'text', content: delta.text }
        } else if (delta.type === 'input_json_delta' && currentToolCall) {
          currentToolCall.arguments = (currentToolCall.arguments || '') + delta.partial_json
          yield { type: 'tool_call_delta', toolCall: currentToolCall }
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolCall) {
          yield { type: 'tool_call_end', toolCall: currentToolCall }
          currentToolCall = null
        }
      }
    }

    const message = await stream.finalMessage()
    this.checkStopReason(message)
    yield { type: 'done', rawContent: message.content }
  }

  /** A refused or cut-off turn must not run tools, so it ends the loop with a clear message. */
  private checkStopReason(message: Anthropic.Message) {
    // SDK 0.39 types do not list 'refusal' yet, so compare as a string
    const stopReason: string | null = message.stop_reason
    if (stopReason === 'refusal') throw new Error('Claude declined this request.')
    if (stopReason === 'max_tokens') throw new Error('The reply was cut off at the output limit.')
  }

  private formatMessages(messages: LLMMessage[]) {
    let system = ''
    const msgs: Anthropic.MessageParam[] = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += msg.content + '\n'
        continue
      }

      if (msg.role === 'user') {
        msgs.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant') {
        if (msg.rawContent) {
          // Thinking blocks are only valid when the turn goes back exactly as Claude wrote it
          msgs.push({ role: 'assistant', content: msg.rawContent as Anthropic.ContentBlockParam[] })
        } else if (msg.toolCalls && msg.toolCalls.length > 0) {
          const content: Anthropic.ContentBlockParam[] = []
          if (msg.content) {
            content.push({ type: 'text', text: msg.content })
          }
          for (const tc of msg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: JSON.parse(tc.arguments),
            })
          }
          msgs.push({ role: 'assistant', content })
        } else {
          msgs.push({ role: 'assistant', content: msg.content })
        }
      } else if (msg.role === 'tool') {
        const result: Anthropic.ToolResultBlockParam = {
          type: 'tool_result',
          tool_use_id: msg.toolCallId!,
          content: msg.content,
        }
        // Claude expects all tool results of one turn in a single user message
        const prev = msgs[msgs.length - 1]
        if (prev?.role === 'user' && Array.isArray(prev.content) && prev.content[0]?.type === 'tool_result') {
          prev.content.push(result)
        } else {
          msgs.push({ role: 'user', content: [result] })
        }
      }
    }

    return { system: system.trim(), msgs }
  }

  private parseResponse(response: Anthropic.Message): LLMMessage {
    let textContent = ''
    const toolCalls: ToolCall[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        })
      }
    }

    return {
      role: 'assistant',
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      rawContent: response.content,
    }
  }
}
