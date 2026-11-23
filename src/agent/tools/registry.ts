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
