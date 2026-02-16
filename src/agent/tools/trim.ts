import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { formatTime } from '@/lib/time'

export class TrimTool extends BaseTool {
  name = 'trim'
  description = 'Adjust the in/out points of a clip. Use this to shorten a clip from the start or end. Provide the clip ID and the new start and/or end times relative to the source media.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to trim',
      },
      newStartInSource: {
        type: 'number',
        description: 'New start point in the source media (seconds). Trims from the beginning.',
      },
      newEndInSource: {
        type: 'number',
        description: 'New end point in the source media (seconds). Trims from the end.',
      },
    },
    required: ['clipId'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string
    const newStartInSource = args.newStartInSource as number | undefined
    const newEndInSource = args.newEndInSource as number | undefined

    if (newStartInSource === undefined && newEndInSource === undefined) {
      return { success: false, message: 'Provide at least one of newStartInSource or newEndInSource' }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    // Find the clip
    let foundTrack: string | null = null
    let foundClip: typeof store.timeline.tracks[0]['clips'][0] | null = null
    for (const track of store.timeline.tracks) {
      const clip = track.clips.find((c) => c.id === clipId)
      if (clip) {
        foundTrack = track.id
        foundClip = clip
        break
      }
    }

    if (!foundTrack || !foundClip) {
      return { success: false, message: `Clip ${clipId} not found` }
    }

    const updates: Partial<typeof foundClip> = {}

    if (newStartInSource !== undefined) {
      if (newStartInSource < 0) {
        return { success: false, message: 'newStartInSource cannot be negative' }
      }
      const trimAmount = (newStartInSource - foundClip.startInSource) / foundClip.speed
      updates.startInSource = newStartInSource
      updates.startInTimeline = foundClip.startInTimeline + trimAmount
      updates.duration = foundClip.duration - trimAmount
    }

    if (newEndInSource !== undefined) {
      if (newEndInSource <= (updates.startInSource ?? foundClip.startInSource)) {
        return { success: false, message: 'newEndInSource must be after startInSource' }
      }
      updates.endInSource = newEndInSource
      const startInSrc = updates.startInSource ?? foundClip.startInSource
      updates.duration = (newEndInSource - startInSrc) / foundClip.speed
    }

    store.updateClip(foundTrack, clipId, updates)
    store.recalcDuration()

    const snapshotAfter = store.getTimelineSnapshot()
    const newDuration = updates.duration ?? foundClip.duration

    useHistoryStore.getState().pushAction(
      'trim',
      `Trim clip to ${formatTime(newDuration)}`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Trimmed clip to ${formatTime(newDuration)}.`,
    }
  }
}
