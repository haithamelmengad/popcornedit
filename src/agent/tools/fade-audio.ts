import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class FadeAudioTool extends BaseTool {
  name = 'fade_audio'
  description =
    'Add audio fade in and/or fade out to a clip. Fade durations are in seconds.'
  parameters = {
    type: 'object' as const,
    properties: {
      clipId: {
        type: 'string',
        description: 'The ID of the clip to add fades to',
      },
      fadeIn: {
        type: 'number',
        description: 'Fade-in duration in seconds (0 to remove)',
      },
      fadeOut: {
        type: 'number',
        description: 'Fade-out duration in seconds (0 to remove)',
      },
    },
    required: ['clipId'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const clipId = args.clipId as string
    const fadeIn = args.fadeIn as number | undefined
    const fadeOut = args.fadeOut as number | undefined

    if (fadeIn === undefined && fadeOut === undefined) {
      return { success: false, message: 'Provide at least one of fadeIn or fadeOut' }
    }
    if (fadeIn !== undefined && fadeIn < 0) {
      return { success: false, message: 'fadeIn cannot be negative' }
    }
    if (fadeOut !== undefined && fadeOut < 0) {
      return { success: false, message: 'fadeOut cannot be negative' }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    let foundTrackId: string | null = null
    let clip: any = null
    for (const track of store.timeline.tracks) {
      const found = track.clips.find((c) => c.id === clipId)
      if (found) {
        foundTrackId = track.id
        clip = found
        break
      }
    }

    if (!foundTrackId || !clip) {
      return { success: false, message: `Clip ${clipId} not found` }
    }

    // Validate fades don't exceed clip duration
    const fi = fadeIn ?? (clip.fadeIn || 0)
    const fo = fadeOut ?? (clip.fadeOut || 0)
    if (fi + fo > clip.duration) {
      return { success: false, message: 'Combined fade durations exceed clip length' }
    }

    const updates: Record<string, unknown> = {}
    if (fadeIn !== undefined) updates.fadeIn = fadeIn
    if (fadeOut !== undefined) updates.fadeOut = fadeOut

    store.updateClip(foundTrackId, clipId, updates as any)

    const snapshotAfter = store.getTimelineSnapshot()
    const parts: string[] = []
    if (fadeIn !== undefined) parts.push(`fade-in ${fadeIn}s`)
    if (fadeOut !== undefined) parts.push(`fade-out ${fadeOut}s`)

    useHistoryStore.getState().pushAction(
      'fade_audio',
      `Set ${parts.join(', ')} on clip`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Set ${parts.join(' and ')} on clip.`,
    }
  }
}
