import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'

export class AddTrackTool extends BaseTool {
  name = 'add_track'
  description = 'Add a new empty track to the timeline.'
  parameters = {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Name for the new track (e.g. "Video 2", "Audio 1")',
      },
      type: {
        type: 'string',
        enum: ['video', 'audio'],
        description: 'Track type: "video" or "audio"',
      },
    },
    required: ['name', 'type'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const name = args.name as string
    const type = args.type as 'video' | 'audio'

    if (!name || !name.trim()) {
      return { success: false, message: 'Track name is required' }
    }
    if (type !== 'video' && type !== 'audio') {
      return { success: false, message: 'Track type must be "video" or "audio"' }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()

    const track = store.addTrack({
      name: name.trim(),
      type,
      clips: [],
      muted: false,
      volume: 1,
      height: 48,
    })

    const snapshotAfter = store.getTimelineSnapshot()
    useHistoryStore.getState().pushAction(
      'add_track',
      `Add ${type} track "${name.trim()}"`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Added ${type} track "${name.trim()}" (ID: ${track.id})`,
      data: { trackId: track.id },
    }
  }
}
