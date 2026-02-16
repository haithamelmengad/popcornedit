import type { LLMProvider } from './types'
import type { ProviderType, ProviderConfig } from '@/lib/types'
import { ClaudeProvider } from './claude'
import { OpenAIProvider } from './openai'
import { GeminiProvider } from './gemini'

export function createProvider(type: ProviderType, config: ProviderConfig): LLMProvider {
  switch (type) {
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model)
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model)
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model)
    default:
      throw new Error(`Unknown provider: ${type}`)
  }
}

export type { LLMProvider, LLMMessage, ToolDefinition, StreamChunk, ToolCall } from './types'
