import type { AgentTool, ToolResult } from './types'
import type { ToolDefinition } from '../providers/types'

class ToolRegistry {
  private tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  execute(name: string, args: Record<string, unknown>): ToolResult {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, message: `Unknown tool: ${name}` }
    }
    // Arguments come from the model: check them against the tool's schema before it touches the timeline
    const schema = tool.parameters as {
      required?: string[]
      properties?: Record<string, { type?: string }>
    }
    for (const key of schema.required || []) {
      if (args[key] === undefined || args[key] === null) {
        return { success: false, message: `Missing required argument: ${key}` }
      }
    }
    for (const [key, value] of Object.entries(args)) {
      const type = schema.properties?.[key]?.type
      if (value == null || !type) continue
      if (typeof value !== type || (type === 'number' && !Number.isFinite(value))) {
        return { success: false, message: `Argument ${key} must be a ${type}` }
      }
    }
    try {
      return tool.execute(args)
    } catch (e) {
      // Arguments come from the model; report a bad call back to it instead of ending the turn
      return { success: false, message: `Tool ${name} failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.toDefinition())
  }

  getNames(): string[] {
    return Array.from(this.tools.keys())
  }

  clear(): void {
    this.tools.clear()
  }
}

// Singleton registry
export const toolRegistry = new ToolRegistry()
