import { toolRegistry } from './registry'
import { GetTimelineTool } from './get-timeline'
import { CutTool } from './cut'
import { TrimTool } from './trim'
import { SplitTool } from './split'
import { SpeedTool } from './speed'
import { VolumeTool } from './volume'
import { DeleteClipTool } from './delete-clip'

/** Register all built-in tools */
export function registerAllTools(): void {
  toolRegistry.register(new GetTimelineTool())
  toolRegistry.register(new CutTool())
  toolRegistry.register(new TrimTool())
  toolRegistry.register(new SplitTool())
  toolRegistry.register(new SpeedTool())
  toolRegistry.register(new VolumeTool())
  toolRegistry.register(new DeleteClipTool())
}

export { toolRegistry } from './registry'
export type { AgentTool, ToolResult } from './types'
