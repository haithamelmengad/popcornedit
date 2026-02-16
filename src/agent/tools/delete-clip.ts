import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class DeleteClipTool extends BaseTool {
  name = 'delete_clip'
  description = 'Delete a clip from the timeline. The clip is removed but no gap closing happens — other clips stay in place.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to delete',
      },
    },
    required: ['clipId'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    let foundTrackId: string | null = null
    for (const track of store.timeline.tracks) {
      if (track.clips.find((c) => c.id === clipId)) {
        foundTrackId = track.id
        break
      }
    }

    if (!foundTrackId) {
      return { success: false, message: `Clip ${clipId} not found` }
    }

    store.removeClip(foundTrackId, clipId)

    const snapshotAfter = store.getTimelineSnapshot()
    useHistoryStore.getState().pushAction(
      'delete_clip',
      'Delete clip',
      snapshotBefore,
      snapshotAfter
    )

    return { success: true, message: 'Clip deleted.' }
  }
}
