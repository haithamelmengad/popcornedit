import { BaseTool, type ToolResult } from './types'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { formatTime } from '@/lib/time'

export class CutTool extends BaseTool {
  name = 'cut'
  description = 'Remove a time range from the timeline. This deletes content between the start and end times, and shifts everything after the cut point earlier to close the gap.'
  parameters = {
    type: 'object' as const,
    properties: {
      start: {
        type: 'number',
        description: 'Start time in seconds for the cut',
      },
      end: {
        type: 'number',
        description: 'End time in seconds for the cut',
      },
      trackId: {
        type: 'string',
        description: 'Optional: specific track ID to cut from. If not provided, cuts from all tracks.',
      },
    },
    required: ['start', 'end'],
  }

  execute(args: Record<string, unknown>): ToolResult {
    const start = args.start as number
    const end = args.end as number
    const trackId = args.trackId as string | undefined

    if (start >= end) {
      return { success: false, message: `Invalid range: start (${start}) must be before end (${end})` }
    }

    const store = useProjectStore.getState()
    const snapshotBefore = store.getTimelineSnapshot()
    const cutDuration = end - start

    const tracksToProcess = trackId
      ? store.timeline.tracks.filter((t) => t.id === trackId)
      : store.timeline.tracks

    if (tracksToProcess.length === 0) {
      return { success: false, message: trackId ? `Track ${trackId} not found` : 'No tracks in timeline' }
    }

    let clipsRemoved = 0
    let clipsTrimmed = 0

    for (const track of tracksToProcess) {
      const clipsToRemove: string[] = []
      const clipsToUpdate: { id: string; updates: Partial<typeof track.clips[0]> }[] = []

      for (const clip of track.clips) {
        const clipEnd = clip.startInTimeline + clip.duration

        // Clip is entirely within the cut range — remove it
        if (clip.startInTimeline >= start && clipEnd <= end) {
          clipsToRemove.push(clip.id)
          clipsRemoved++
          continue
        }

        // Clip starts before cut and ends within cut — trim end
        if (clip.startInTimeline < start && clipEnd > start && clipEnd <= end) {
          const newDuration = start - clip.startInTimeline
          clipsToUpdate.push({
            id: clip.id,
            updates: {
              duration: newDuration,
              endInSource: clip.startInSource + newDuration * clip.speed,
            },
          })
          clipsTrimmed++
          continue
        }

        // Clip starts within cut and ends after cut — trim start, shift left
        if (clip.startInTimeline >= start && clip.startInTimeline < end && clipEnd > end) {
          const trimAmount = end - clip.startInTimeline
          clipsToUpdate.push({
            id: clip.id,
            updates: {
              startInTimeline: start,
              startInSource: clip.startInSource + trimAmount * clip.speed,
              duration: clip.duration - trimAmount,
            },
          })
          clipsTrimmed++
          continue
        }

        // Clip spans the entire cut range — split into two parts
        if (clip.startInTimeline < start && clipEnd > end) {
          // Trim this clip to end at cut start
          clipsToUpdate.push({
            id: clip.id,
            updates: {
              duration: start - clip.startInTimeline,
              endInSource: clip.startInSource + (start - clip.startInTimeline) * clip.speed,
            },
          })
          // Add new clip for the part after the cut
          const afterStart = clip.startInSource + (end - clip.startInTimeline) * clip.speed
          store.addClip(track.id, {
            mediaFileId: clip.mediaFileId,
            startInTimeline: start,
            startInSource: afterStart,
            endInSource: clip.endInSource,
            duration: clipEnd - end,
            speed: clip.speed,
            volume: clip.volume,
          })
          clipsTrimmed++
          continue
        }

        // Clip is entirely after the cut — shift left
        if (clip.startInTimeline >= end) {
          clipsToUpdate.push({
            id: clip.id,
            updates: {
              startInTimeline: clip.startInTimeline - cutDuration,
            },
          })
        }
      }

      // Apply removals
      for (const clipId of clipsToRemove) {
        store.removeClip(track.id, clipId)
      }

      // Apply updates
      for (const { id, updates } of clipsToUpdate) {
        store.updateClip(track.id, id, updates)
      }
    }

    store.recalcDuration()
    const snapshotAfter = store.getTimelineSnapshot()

    useHistoryStore.getState().pushAction(
      'cut',
      `Cut ${formatTime(start)} - ${formatTime(end)}`,
      snapshotBefore,
      snapshotAfter
    )

    return {
      success: true,
      message: `Cut ${formatTime(start)} - ${formatTime(end)} (${cutDuration.toFixed(1)}s). ${clipsRemoved} clip(s) removed, ${clipsTrimmed} clip(s) trimmed.`,
    }
  }
}
