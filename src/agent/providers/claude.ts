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
      max_tokens: 4096,
      system: system || undefined,
      messages: msgs,
      tools: tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
    })

    return this.parseResponse(response)
  }

  async *chatStream(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const { system, msgs } = this.formatMessages(messages)

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
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
      } else if (event.type === 'message_stop') {
        yield { type: 'done' }
      }
    }
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
        if (msg.toolCalls && msg.toolCalls.length > 0) {
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
        msgs.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId!,
              content: msg.content,
            },
          ],
        })
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
    }
  }
}
