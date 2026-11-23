import { GoogleGenerativeAI, type Content, type Part, type FunctionDeclaration } from '@google/generative-ai'
import type { LLMProvider, LLMMessage, ToolDefinition, StreamChunk, ToolCall } from './types'

export class GeminiProvider implements LLMProvider {
  name = 'gemini'
  private client: GoogleGenerativeAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey)
    this.model = model
  }

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage> {
    const { systemInstruction, contents } = this.formatMessages(messages)

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemInstruction || undefined,
      tools: tools ? [{ functionDeclarations: tools.map(this.toFunctionDeclaration) }] : undefined,
    })

    const result = await genModel.generateContent({ contents })
    return this.parseResponse(result.response)
  }

  async *chatStream(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const { systemInstruction, contents } = this.formatMessages(messages)

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemInstruction || undefined,
      tools: tools ? [{ functionDeclarations: tools.map(this.toFunctionDeclaration) }] : undefined,
    })

    const result = await genModel.generateContentStream({ contents })
    const rawParts: Part[] = []

    // Read result.stream, not result.response: the SDK rebuilds that one and drops thought signatures
    for await (const chunk of result.stream) {
      const parts = chunk.candidates?.[0]?.content?.parts
      if (!parts) continue
      rawParts.push(...parts)

      for (const part of parts) {
        if (part.text) {
          yield { type: 'text', content: part.text }
        }
        if (part.functionCall) {
          const toolCall: Partial<ToolCall> = {
            id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          }
          yield { type: 'tool_call_start', toolCall }
          yield { type: 'tool_call_end', toolCall }
        }
      }
    }

    yield { type: 'done', rawContent: rawParts }
  }

  private formatMessages(messages: LLMMessage[]) {
    let systemInstruction = ''
    const contents: Content[] = []
    const toolNames = new Map<string, string>() // tool call id -> function name

    // Gemini wants one message per turn, so join neighbours with the same role
    const push = (role: string, parts: Part[]) => {
      const prev = contents[contents.length - 1]
      if (prev?.role === role) prev.parts.push(...parts)
      else contents.push({ role, parts })
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += msg.content + '\n'
      } else if (msg.role === 'user') {
        push('user', [{ text: msg.content }])
      } else if (msg.role === 'assistant') {
        const parts: Part[] = []
        if (msg.content) parts.push({ text: msg.content })
        for (const tc of msg.toolCalls || []) {
          toolNames.set(tc.id, tc.name)
          parts.push({ functionCall: { name: tc.name, args: JSON.parse(tc.arguments) } })
        }
        // Gemini 3 and later reject a tool loop unless the turn goes back as it came, thought signatures included
        const raw = msg.rawContent as Part[] | undefined
        if (raw?.length) push('model', [...raw])
        else if (parts.length > 0) push('model', parts)
      } else {
        // A tool result must carry the name of the function that was called
        push('function', [
          {
            functionResponse: {
              name: toolNames.get(msg.toolCallId || '') || 'tool_result',
              response: { result: msg.content },
            },
          },
        ])
      }
    }

    return { systemInstruction: systemInstruction.trim(), contents }
  }

  private parseResponse(response: any): LLMMessage {
    let textContent = ''
    const toolCalls: ToolCall[] = []

    const parts = response.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.text) textContent += part.text
      if (part.functionCall) {
        toolCalls.push({
          id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args),
        })
      }
    }

    return {
      role: 'assistant',
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      rawContent: parts,
    }
  }

  private toFunctionDeclaration(tool: ToolDefinition): FunctionDeclaration {
    // Gemini rejects an object schema with no properties, so leave it out for tools without parameters
    const hasParams = Object.keys((tool.parameters.properties as object) || {}).length > 0
    return {
      name: tool.name,
      description: tool.description,
      ...(hasParams && { parameters: tool.parameters as any }),
    }
  }
}
