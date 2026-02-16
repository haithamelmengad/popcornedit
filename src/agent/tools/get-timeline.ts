import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { formatTime } from '@/lib/time'

export class GetTimelineTool extends BaseTool {
  name = 'get_timeline'
  description = 'Get the current state of the timeline including all tracks, clips, and durations. Use this to understand what the user is working with before making edits.'
  parameters = {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  }

  execute(): ToolResult {
    const { timeline, mediaFiles } = useProjectStore.getState()

    if (timeline.tracks.length === 0) {
      return {
        success: true,
        message: 'Timeline is empty. No tracks or clips.',
        data: { tracks: [], duration: 0 },
      }
    }

    const tracksInfo = timeline.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      type: track.type,
      muted: track.muted,
      volume: track.volume,
      clips: track.clips.map((clip) => {
        const media = mediaFiles.find((f) => f.id === clip.mediaFileId)
        return {
          id: clip.id,
          mediaFile: media?.name || 'unknown',
          startInTimeline: formatTime(clip.startInTimeline),
          startInTimelineSec: clip.startInTimeline,
          duration: formatTime(clip.duration),
          durationSec: clip.duration,
          sourceRange: `${formatTime(clip.startInSource)} - ${formatTime(clip.endInSource)}`,
          speed: clip.speed,
          volume: clip.volume,
        }
      }),
    }))

    return {
      success: true,
      message: `Timeline: ${timeline.tracks.length} track(s), ${formatTime(timeline.duration)} total duration.`,
      data: {
        tracks: tracksInfo,
        totalDuration: timeline.duration,
        totalDurationFormatted: formatTime(timeline.duration),
      },
    }
  }
}
