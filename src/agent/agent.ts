import { createProvider, type LLMProvider, type LLMMessage, type ToolCall } from './providers'
import { toolRegistry, registerAllTools } from './tools'
import { useSettingsStore } from '@/stores/settings'
import { useChatStore } from '@/stores/chat'
import type { FrameAttachment } from '@/lib/types'

const SYSTEM_PROMPT = `You are Popcorn, an AI video editing assistant. You help users edit video by executing tools on their timeline.

You have access to tools for editing the timeline. Always call get_timeline first to understand the current state before making edits.

When the user asks you to make changes:
1. Use get_timeline to see the current state
2. Plan the edits needed
3. Execute them using the available tools
4. Confirm what was done

Be concise. Describe what you did, not how the tools work. If a tool fails, explain why and suggest alternatives.

When referring to times, use MM:SS format (e.g., 1:30 for 1 minute 30 seconds).`

// Ensure tools are registered
let toolsRegistered = false
function ensureTools() {
  if (!toolsRegistered) {
    registerAllTools()
    toolsRegistered = true
  }
}

/**
 * Parse tool arguments from the model. A tool with no parameters streams an
 * empty string, and bad JSON must not reach the next request, so both become {}.
 */
function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // fall through
  }
  return {}
}

/** Maximum tool call rounds per user message (prevents infinite loops) */
const MAX_TOOL_ROUNDS = 10

/**
 * Run the agent for a user message.
 * Sends to LLM, executes tool calls, loops until done.
 */
export async function runAgent(
  userMessage: string,
  attachments?: FrameAttachment[]
): Promise<void> {
  ensureTools()

  const settingsStore = useSettingsStore.getState()
  const config = settingsStore.getActiveConfig()
  if (!config || !config.apiKey) {
    useChatStore.getState().addMessage(
      'assistant',
      'No API key configured. Open Settings to add one.'
    )
    return
  }

  let provider: LLMProvider
  try {
    provider = createProvider(settingsStore.activeProvider, config)
  } catch (e: any) {
    useChatStore.getState().addMessage('assistant', `Failed to create provider: ${e.message}`)
    return
  }

  const chatStore = useChatStore.getState()
  chatStore.setAgentThinking(true)

  // Build message history for the LLM
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  // Add conversation history (last 20 messages for context window management)
  const recentMessages = chatStore.messages.slice(-20)
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      let content = msg.content
      if (msg.attachments && msg.attachments.length > 0) {
        content += '\n[Attached frames: ' +
          msg.attachments.map((a) => `frame at ${a.timestamp.toFixed(1)}s`).join(', ') +
          ']'
      }
      llmMessages.push({ role: 'user', content })
    } else if (msg.role === 'assistant' && msg.content) {
      // Providers reject an assistant message with no text
      llmMessages.push({ role: 'assistant', content: msg.content })
    }
  }

  // Add current user message, unless the chat input already put it in the store
  const last = recentMessages[recentMessages.length - 1]
  if (!(last?.role === 'user' && last.content === userMessage)) {
    let currentContent = userMessage
    if (attachments && attachments.length > 0) {
      currentContent += '\n[Attached frames: ' +
        attachments.map((a) => `frame at ${a.timestamp.toFixed(1)}s`).join(', ') +
        ']'
    }
    llmMessages.push({ role: 'user', content: currentContent })
  }

  // Create placeholder assistant message for streaming
  const assistantMsg = useChatStore.getState().addMessage('assistant', '')
  useChatStore.getState().updateMessage(assistantMsg.id, { isStreaming: true })

  const toolDefs = toolRegistry.getDefinitions()
  let rounds = 0
  let shownText = '' // what the chat shows, kept across tool rounds

  try {
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++

      // Stream the response
      let roundText = '' // this round's own text, the only text sent back to the model
      const pendingToolCalls: ToolCall[] = []
      let rawContent: unknown
      const toolCallBuilders = new Map<string, { id: string; name: string; args: string }>()

      for await (const chunk of provider.chatStream(llmMessages, toolDefs)) {
        if (chunk.type === 'text' && chunk.content) {
          // A later round starts on its own line, after the tool status lines
          if (!roundText && shownText) shownText += '\n'
          roundText += chunk.content
          shownText += chunk.content
          useChatStore.getState().updateMessage(assistantMsg.id, { content: shownText })
        } else if (chunk.type === 'tool_call_start' && chunk.toolCall) {
          const tc = chunk.toolCall
          toolCallBuilders.set(tc.id || '', {
            id: tc.id || '',
            name: tc.name || '',
            args: tc.arguments || '',
          })
        } else if (chunk.type === 'tool_call_delta' && chunk.toolCall) {
          const existing = toolCallBuilders.get(chunk.toolCall.id || '')
          if (existing && chunk.toolCall.arguments) {
            existing.args = chunk.toolCall.arguments
          }
        } else if (chunk.type === 'tool_call_end' && chunk.toolCall) {
          const tc = toolCallBuilders.get(chunk.toolCall.id || '')
          if (tc) {
            pendingToolCalls.push({
              id: tc.id,
              name: tc.name,
              arguments: JSON.stringify(parseToolArgs(tc.args)),
            })
          }
        } else if (chunk.type === 'done') {
          rawContent = chunk.rawContent
        }
      }

      // If no tool calls, we're done
      if (pendingToolCalls.length === 0) {
        break
      }

      // Add assistant message with tool calls to history
      llmMessages.push({
        role: 'assistant',
        content: roundText,
        toolCalls: pendingToolCalls,
        rawContent,
      })

      // Execute each tool call
      for (const tc of pendingToolCalls) {
        const result = toolRegistry.execute(tc.name, parseToolArgs(tc.arguments))

        // Show tool result in the message
        const statusIcon = result.success ? '✓' : '✗'
        shownText += `\n${statusIcon} ${result.message}`
        useChatStore.getState().updateMessage(assistantMsg.id, { content: shownText })

        // Add tool result to LLM history
        llmMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: tc.id,
        })
      }

      // Continue the loop — LLM will see tool results and may call more tools or respond
    }
  } catch (e: any) {
    const errorMsg = e.message || 'Unknown error'
    useChatStore.getState().updateMessage(assistantMsg.id, {
      content: (useChatStore.getState().messages.find((m) => m.id === assistantMsg.id)?.content || '') +
        `\n\nError: ${errorMsg}`,
    })
  } finally {
    useChatStore.getState().updateMessage(assistantMsg.id, { isStreaming: false })
    useChatStore.getState().setAgentThinking(false)
  }
}
