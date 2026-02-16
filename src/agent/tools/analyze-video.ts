import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { generateSampleTimestamps } from '../video-understanding/frame-sampler'
import { formatIndexForLLM, buildVideoIndex } from '../video-understanding/indexer'

export class AnalyzeVideoTool extends BaseTool {
  name = 'analyze_video'
  description =
    'Analyze a video by extracting frame timestamps and transcript for a time range. Returns a summary the agent can use to understand video content. Note: frame extraction requires a loaded video element — this tool returns the analysis plan and any available transcript.'
  parameters = {
    type: 'object' as const,
    properties: {
      start: {
        type: 'number',
        description: 'Start time in seconds (default: 0)',
      },
      end: {
        type: 'number',
        description: 'End time in seconds (default: video duration)',
      },
      frameCount: {
        type: 'number',
        description: 'Number of frames to sample (default: 5)',
      },
    },
    required: [],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const store = useProjectStore.getState()
    const videoFile = store.mediaFiles.find((f) => f.type === 'video')

    if (!videoFile) {
      return { success: false, message: 'No video file loaded in the project.' }
    }

    const start = (args.start as number) ?? 0
    const end = (args.end as number) ?? videoFile.duration
    const frameCount = (args.frameCount as number) ?? 5

    if (start < 0 || end < 0) {
      return { success: false, message: 'Start and end must be non-negative.' }
    }
    if (start >= end) {
      return { success: false, message: 'Start must be before end.' }
    }

    // Generate timestamps for frame sampling
    const timestamps = generateSampleTimestamps(videoFile.duration, frameCount, start, end)

    // Build a basic index (without actual frames — those need canvas/video element)
    const index = buildVideoIndex(
      videoFile.id,
      videoFile.duration,
      timestamps.map((ts) => ({
        timestamp: ts,
        dataUrl: '',
        width: 0,
        height: 0,
      })),
      { segments: [], fullText: '', language: 'en' }
    )

    const summary = formatIndexForLLM(index)

    return {
      success: true,
      message: `Video analysis for ${videoFile.name} (${start.toFixed(1)}s - ${end.toFixed(1)}s):\n\n${summary}\n\nFrame sample timestamps: ${timestamps.map((t) => t.toFixed(1) + 's').join(', ')}`,
      data: {
        mediaFileId: videoFile.id,
        name: videoFile.name,
        duration: videoFile.duration,
        sampleTimestamps: timestamps,
        sceneCount: index.scenes.length,
      },
    }
  }
}
