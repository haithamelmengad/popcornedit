import { toolRegistry } from './registry'
import { GetTimelineTool } from './get-timeline'
import { CutTool } from './cut'
import { TrimTool } from './trim'
import { SplitTool } from './split'
import { SpeedTool } from './speed'
import { VolumeTool } from './volume'
import { DeleteClipTool } from './delete-clip'
import { MoveClipTool } from './move-clip'
import { DuplicateClipTool } from './duplicate-clip'
import { AddTrackTool } from './add-track'
import { FadeAudioTool } from './fade-audio'
import { ExportTool } from './export'
import { AnalyzeVideoTool } from './analyze-video'

/** Register all built-in tools */
export function registerAllTools(): void {
  toolRegistry.register(new GetTimelineTool())
  toolRegistry.register(new CutTool())
  toolRegistry.register(new TrimTool())
  toolRegistry.register(new SplitTool())
  toolRegistry.register(new SpeedTool())
  toolRegistry.register(new VolumeTool())
  toolRegistry.register(new DeleteClipTool())
  toolRegistry.register(new MoveClipTool())
  toolRegistry.register(new DuplicateClipTool())
  toolRegistry.register(new AddTrackTool())
  toolRegistry.register(new FadeAudioTool())
  toolRegistry.register(new ExportTool())
  toolRegistry.register(new AnalyzeVideoTool())
}

export { toolRegistry } from './registry'
export type { AgentTool, ToolResult } from './types'
