import type { ToolDefinition } from '../providers/types'

export interface ToolResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export interface AgentTool {
  /** Tool name (matches ToolDefinition.name) */
  name: string

  /** Human-readable description for the LLM */
  description: string

  /** JSON Schema for parameters */
  parameters: Record<string, unknown>

  /** Execute the tool with parsed arguments */
  execute(args: Record<string, unknown>): ToolResult

  /** Convert to LLM ToolDefinition format */
  toDefinition(): ToolDefinition
}

/** Base class for tools — provides toDefinition() */
export abstract class BaseTool implements AgentTool {
  abstract name: string
  abstract description: string
  abstract parameters: Record<string, unknown>
  abstract execute(args: Record<string, unknown>): ToolResult

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    }
  }
}
