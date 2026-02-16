import OpenAI from 'openai'
import type { LLMProvider, LLMMessage, ToolDefinition, StreamChunk, ToolCall } from './types'

export class OpenAIProvider implements LLMProvider {
  name = 'openai'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    this.model = model
  }

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.formatMessages(messages),
      tools: tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
    })

    const choice = response.choices[0]
    const msg = choice.message

    const toolCalls: ToolCall[] | undefined = msg.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }))

    return {
      role: 'assistant',
      content: msg.content || '',
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
    }
  }

  async *chatStream(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: this.formatMessages(messages),
      tools: tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      stream: true,
    })

    const activeToolCalls = new Map<number, Partial<ToolCall>>()

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      if (delta?.content) {
        yield { type: 'text', content: delta.content }
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!activeToolCalls.has(tc.index)) {
            const toolCall: Partial<ToolCall> = {
              id: tc.id,
              name: tc.function?.name,
              arguments: tc.function?.arguments || '',
            }
            activeToolCalls.set(tc.index, toolCall)
            yield { type: 'tool_call_start', toolCall }
          } else {
            const existing = activeToolCalls.get(tc.index)!
            if (tc.function?.arguments) {
              existing.arguments = (existing.arguments || '') + tc.function.arguments
            }
            yield { type: 'tool_call_delta', toolCall: existing }
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        for (const toolCall of activeToolCalls.values()) {
          yield { type: 'tool_call_end', toolCall }
        }
        yield { type: 'done' }
      }
    }
  }

  private formatMessages(messages: LLMMessage[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'system') {
        return { role: 'system' as const, content: msg.content }
      }
      if (msg.role === 'user') {
        return { role: 'user' as const, content: msg.content }
      }
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId!,
        }
      }
      // assistant
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        }
      }
      return { role: 'assistant' as const, content: msg.content }
    })
  }
}
