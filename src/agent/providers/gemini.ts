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
    const { systemInstruction, history, lastUserMessage } = this.formatMessages(messages)

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemInstruction || undefined,
      tools: tools ? [{ functionDeclarations: tools.map(this.toFunctionDeclaration) }] : undefined,
    })

    const chat = genModel.startChat({ history })
    const result = await chat.sendMessage(lastUserMessage)
    const response = result.response

    return this.parseResponse(response)
  }

  async *chatStream(messages: LLMMessage[], tools?: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const { systemInstruction, history, lastUserMessage } = this.formatMessages(messages)

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemInstruction || undefined,
      tools: tools ? [{ functionDeclarations: tools.map(this.toFunctionDeclaration) }] : undefined,
    })

    const chat = genModel.startChat({ history })
    const result = await chat.sendMessageStream(lastUserMessage)

    for await (const chunk of result.stream) {
      const parts = chunk.candidates?.[0]?.content?.parts
      if (!parts) continue

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

    yield { type: 'done' }
  }

  private formatMessages(messages: LLMMessage[]) {
    let systemInstruction = ''
    const history: Content[] = []
    let lastUserMessage = ''

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += msg.content + '\n'
        continue
      }

      if (msg.role === 'user') {
        lastUserMessage = msg.content
        // Don't add to history yet — last user message is sent via sendMessage
      } else if (msg.role === 'assistant') {
        // Push previous user message to history first
        if (lastUserMessage) {
          history.push({ role: 'user', parts: [{ text: lastUserMessage }] })
          lastUserMessage = ''
        }

        const parts: Part[] = []
        if (msg.content) parts.push({ text: msg.content })
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: { name: tc.name, args: JSON.parse(tc.arguments) },
            })
          }
        }
        if (parts.length > 0) {
          history.push({ role: 'model', parts })
        }
      } else if (msg.role === 'tool') {
        // Push previous user message to history
        if (lastUserMessage) {
          history.push({ role: 'user', parts: [{ text: lastUserMessage }] })
          lastUserMessage = ''
        }
        history.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: 'tool_result',
                response: { result: msg.content },
              },
            },
          ],
        })
      }
    }

    return { systemInstruction: systemInstruction.trim(), history, lastUserMessage }
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
    }
  }

  private toFunctionDeclaration(tool: ToolDefinition): FunctionDeclaration {
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
    }
  }
}
