// ============================================================
// Provider-agnostic LLM interface
// ============================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string       // for tool result messages
  toolCalls?: ToolCall[]    // for assistant messages with tool use
  /** The provider's own content for this assistant turn. Claude needs it sent back unchanged in the same tool loop. Other providers ignore it. */
  rawContent?: unknown
}

export interface ToolCall {
  id: string
  name: string
  arguments: string         // JSON string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>  // JSON Schema
}

export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done'
  content?: string
  toolCall?: Partial<ToolCall>
  rawContent?: unknown      // on 'done': see LLMMessage.rawContent
}

export interface LLMProvider {
  /** Provider identifier */
  name: string

  /** Send messages and get a complete response (non-streaming) */
  chat(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
  ): Promise<LLMMessage>

  /** Send messages and stream the response */
  chatStream(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
  ): AsyncGenerator<StreamChunk>
}
