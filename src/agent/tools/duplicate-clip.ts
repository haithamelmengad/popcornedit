import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class DuplicateClipTool extends BaseTool {
  name = 'duplicate_clip'
  description =
    'Duplicate a clip. The copy is placed immediately after the original on the same track.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to duplicate',
      },
    },
    required: ['clipId'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    let foundTrackId: string | null = null
    let original: any = null
    for (const track of store.timeline.tracks) {
      const found = track.clips.find((c) => c.id === clipId)
      if (found) {
        foundTrackId = track.id
        original = found
        break
      }
    }

    if (!foundTrackId || !original) {
      return { success: false, message: `Clip ${clipId} not found` }
    }

    const newClip = store.addClip(foundTrackId, {
      mediaFileId: original.mediaFileId,
      startInTimeline: original.startInTimeline + original.duration,
      startInSource: original.startInSource,
      endInSource: original.endInSource,
      duration: original.duration,
      speed: original.speed,
      volume: original.volume,
    })

    const snapshotAfter = store.getTimelineSnapshot()
    useHistoryStore.getState().pushAction(
      'duplicate_clip',
      'Duplicate clip',
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Duplicated clip. New clip ID: ${newClip.id}`,
      data: { newClipId: newClip.id },
    }
  }
}
