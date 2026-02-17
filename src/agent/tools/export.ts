import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'
import { buildExportCommand, type ExportOptions } from '@/lib/ffmpeg'
import { runFFmpeg, isElectron, onFFmpegProgress } from '@/lib/platform'

/**
 * Parse FFmpeg stderr for progress. Looks for "time=HH:MM:SS.ms" pattern.
 */
function parseFFmpegTime(line: string): number | null {
  const match = line.match(/time=(\d+):(\d+):(\d+)\.(\d+)/)
  if (!match) return null
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 100
}

export class ExportTool extends BaseTool {
  name = 'export'
  description =
    'Export the current timeline as a video file. Requires Electron (desktop app) with FFmpeg installed.'
  parameters = {
    type: 'object' as const,
    properties: {
      outputPath: {
        type: 'string',
        description: 'Full file path for the output video (e.g. "/Users/me/Desktop/output.mp4")',
      },
      format: {
        type: 'string',
        enum: ['mp4', 'webm', 'mov'],
        description: 'Output format (default: mp4)',
      },
      quality: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'lossless'],
        description: 'Quality preset (default: medium)',
      },
    },
    required: ['outputPath'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const outputPath = args.outputPath as string
    const format = (args.format as ExportOptions['format']) || 'mp4'
    const quality = (args.quality as ExportOptions['quality']) || 'medium'

    if (!isElectron()) {
      return {
        success: false,
        message: 'Export requires the desktop app (Electron) with FFmpeg installed.',
      }
    }

    const store = useProjectStore.getState()
    const ui = useUIStore.getState()
    const { timeline, mediaFiles } = store

    if (timeline.tracks.length === 0) {
      return { success: false, message: 'Timeline is empty — nothing to export.' }
    }

    const totalClips = timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0)
    if (totalClips === 0) {
      return { success: false, message: 'No clips on the timeline — nothing to export.' }
    }

    // Build media file path map
    const mediaPathMap = new Map<string, string>()
    for (const mf of mediaFiles) {
      mediaPathMap.set(mf.id, mf.path)
    }

    const ffmpegArgs = buildExportCommand(timeline, mediaPathMap, {
      outputPath,
      format,
      quality,
    })

    // Start progress tracking
    ui.setExporting(true)
    const totalDuration = timeline.duration

    const cleanup = onFFmpegProgress((data) => {
      const time = parseFFmpegTime(data)
      if (time !== null && totalDuration > 0) {
        useUIStore.getState().setExportProgress(Math.min(time / totalDuration, 1))
      }
    })

    // Run async with progress tracking
    runFFmpeg(ffmpegArgs)
      .then(() => {
        useUIStore.getState().setExportProgress(1)
        setTimeout(() => useUIStore.getState().setExporting(false), 1500)
      })
      .catch((err) => {
        useUIStore.getState().setExportError(err.message || 'Export failed')
      })
      .finally(cleanup)

    return {
      success: true,
      message: `Export started → ${outputPath} (${format}, ${quality} quality, ${totalClips} clips). This will run in the background.`,
      data: { outputPath, format, quality },
    }
  }
}

export { parseFFmpegTime }
