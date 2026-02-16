import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { formatTime } from '@/lib/time'

export class SplitTool extends BaseTool {
  name = 'split'
  description = 'Split a clip at a specific time, creating two separate clips. The split point is relative to the timeline position.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to split',
      },
      time: {
        type: 'number',
        description: 'The timeline time (in seconds) at which to split the clip',
      },
    },
    required: ['clipId', 'time'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string
    const time = args.time as number

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    // Find the clip
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

    const clipEnd = foundClip.startInTimeline + foundClip.duration

    if (time <= foundClip.startInTimeline || time >= clipEnd) {
      return {
        success: false,
        message: `Split time ${formatTime(time)} is outside clip range (${formatTime(foundClip.startInTimeline)} - ${formatTime(clipEnd)})`,
      }
    }

    // Calculate split point in source media
    const timeIntoClip = time - foundClip.startInTimeline
    const sourceTimeAtSplit = foundClip.startInSource + timeIntoClip / foundClip.speed

    // Trim the first clip (original) to end at split point
    const firstDuration = timeIntoClip
    store.updateClip(foundTrackId, clipId, {
      duration: firstDuration,
      endInSource: sourceTimeAtSplit,
    })

    // Create the second clip (after split)
    const secondDuration = foundClip.duration - timeIntoClip
    const secondClip = store.addClip(foundTrackId, {
      mediaFileId: foundClip.mediaFileId,
      startInTimeline: time,
      startInSource: sourceTimeAtSplit,
      endInSource: foundClip.endInSource,
      duration: secondDuration,
      speed: foundClip.speed,
      volume: foundClip.volume,
    })

    const snapshotAfter = store.getTimelineSnapshot()

    useHistoryStore.getState().pushAction(
      'split',
      `Split at ${formatTime(time)}`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Split clip at ${formatTime(time)} into two clips: ${formatTime(firstDuration)} + ${formatTime(secondDuration)}.`,
      data: {
        firstClipId: clipId,
        secondClipId: secondClip.id,
      },
    }
  }
}
