import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class MoveClipTool extends BaseTool {
  name = 'move_clip'
  description =
    'Move a clip to a new position on the timeline. Optionally move it to a different track.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to move',
      },
      newStartInTimeline: {
        type: 'number',
        description: 'New start position on the timeline (seconds)',
      },
      newTrackId: {
        type: 'string',
        description: 'Optional: move clip to a different track',
      },
    },
    required: ['clipId', 'newStartInTimeline'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string
    const newStart = args.newStartInTimeline as number
    const newTrackId = args.newTrackId as string | undefined

    if (newStart < 0) {
      return { success: false, message: 'Start position cannot be negative' }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    // Find the clip and its track
    let sourceTrackId: string | null = null
    let clip: any = null
    for (const track of store.timeline.tracks) {
      const found = track.clips.find((c) => c.id === clipId)
      if (found) {
        sourceTrackId = track.id
        clip = { ...found }
        break
      }
    }

    if (!sourceTrackId || !clip) {
      return { success: false, message: `Clip ${clipId} not found` }
    }

    const targetTrackId = newTrackId || sourceTrackId

    // Verify target track exists
    if (newTrackId && !store.timeline.tracks.find((t) => t.id === newTrackId)) {
      return { success: false, message: `Track ${newTrackId} not found` }
    }

    if (targetTrackId === sourceTrackId) {
      // Same track — just update position
      store.updateClip(sourceTrackId, clipId, { startInTimeline: newStart })
    } else {
      // Different track — remove from source, add to target
      store.removeClip(sourceTrackId, clipId)
      store.addClip(targetTrackId, {
        mediaFileId: clip.mediaFileId,
        startInTimeline: newStart,
        startInSource: clip.startInSource,
        endInSource: clip.endInSource,
        duration: clip.duration,
        speed: clip.speed,
        volume: clip.volume,
      })
    }

    const snapshotAfter = store.getTimelineSnapshot()
    useHistoryStore.getState().pushAction(
      'move_clip',
      `Move clip to ${newStart.toFixed(1)}s${newTrackId ? ' (new track)' : ''}`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Moved clip to ${newStart.toFixed(1)}s${newTrackId ? ' on new track' : ''}.`,
    }
  }
}
