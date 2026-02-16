import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class VolumeTool extends BaseTool {
  name = 'volume'
  description = 'Adjust the audio volume of a clip or an entire track. Volume is a multiplier: 1 is normal, 0 is muted, 2 is double volume.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to adjust. Provide either clipId or trackId.',
      },
      trackId: {
        type: 'string',
        description: 'The ID of the track to adjust. Adjusts the track-level volume.',
      },
      volume: {
        type: 'number',
        description: 'The new volume multiplier (0 = muted, 1 = normal, 2 = double)',
      },
    },
    required: ['volume'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string | undefined
    const trackId = args.trackId as string | undefined
    const volume = args.volume as number

    if (volume < 0) {
      return { success: false, message: 'Volume cannot be negative' }
    }

    if (!clipId && !trackId) {
      return { success: false, message: 'Provide either clipId or trackId' }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    if (trackId) {
      const track = store.timeline.tracks.find((t) => t.id === trackId)
      if (!track) return { success: false, message: `Track ${trackId} not found` }

      store.updateTrack(trackId, { volume })

      const snapshotAfter = store.getTimelineSnapshot()
      useHistoryStore.getState().pushAction(
        'volume',
        `Volume ${Math.round(volume * 100)}% on ${track.name}`,
        snapshotBefore,
        snapshotAfter
      )

      return {
        success: true,
        message: `Set ${track.name} volume to ${Math.round(volume * 100)}%.`,
      }
    }

    // Clip volume
    let foundTrack: string | null = null
    for (const track of store.timeline.tracks) {
      if (track.clips.find((c) => c.id === clipId)) {
        foundTrack = track.id
        break
      }
    }

    if (!foundTrack) return { success: false, message: `Clip ${clipId} not found` }

    store.updateClip(foundTrack, clipId!, { volume })

    const snapshotAfter = store.getTimelineSnapshot()
    useHistoryStore.getState().pushAction(
      'volume',
      `Volume ${Math.round(volume * 100)}%`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Set clip volume to ${Math.round(volume * 100)}%.`,
    }
  }
}
