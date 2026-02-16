import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class SpeedTool extends BaseTool {
  name = 'speed'
  description = 'Change the playback speed of a clip. A speed of 2 means 2x faster (half duration), 0.5 means half speed (double duration).'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to change speed for',
      },
      speed: {
        type: 'number',
        description: 'The new playback speed multiplier (e.g., 0.5, 1, 1.5, 2)',
      },
    },
    required: ['clipId', 'speed'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string
    const speed = args.speed as number

    if (speed <= 0 || speed > 100) {
      return { success: false, message: `Invalid speed: ${speed}. Must be between 0 and 100.` }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    let foundTrackId: string | null = null
    let foundClip: typeof store.timeline.tracks[0]['clips'][0] | null = null
    for (const track of store.timeline.tracks) {
      const clip = track.clips.find((c) => c.id === clipId)
      if (clip) {
        foundTrackId = track.id
        foundClip = clip
        break
      }
    }

    if (!foundTrackId || !foundClip) {
      return { success: false, message: `Clip ${clipId} not found` }
    }

    const sourceDuration = foundClip.endInSource - foundClip.startInSource
    const newDuration = sourceDuration / speed

    store.updateClip(foundTrackId, clipId, { speed, duration: newDuration })
    store.recalcDuration()

    const snapshotAfter = store.getTimelineSnapshot()

    useHistoryStore.getState().pushAction(
      'speed',
      `Speed ${speed}x`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Changed speed to ${speed}x. New clip duration: ${newDuration.toFixed(1)}s.`,
    }
  }
}
