/**
 * Video indexer — builds a searchable index of a video.
 * Combines frame sampling + transcript into a unified index.
 */

import type { SampledFrame } from './frame-sampler'
import type { Transcript, TranscriptSegment } from './transcript'

export interface VideoScene {
  start: number
  end: number
  keyframe?: SampledFrame
  transcriptSegments: TranscriptSegment[]
  description?: string    // filled in by LLM analysis
}

export interface VideoIndex {
  mediaFileId: string
  duration: number
  scenes: VideoScene[]
  transcript: Transcript
  createdAt: number
}

/**
 * Build a video index by dividing the video into scenes of roughly equal length.
 * Each scene gets a keyframe (middle of scene) and any transcript segments that overlap.
 */
export function buildVideoIndex(
  mediaFileId: string,
  duration: number,
  frames: SampledFrame[],
  transcript: Transcript,
  sceneCount?: number
): VideoIndex {
  const numScenes = sceneCount || Math.max(1, Math.ceil(duration / 30)) // ~30s per scene
  const sceneDuration = duration / numScenes
  const scenes: VideoScene[] = []

  for (let i = 0; i < numScenes; i++) {
    const start = i * sceneDuration
    const end = Math.min((i + 1) * sceneDuration, duration)
    const mid = (start + end) / 2

    // Find closest frame to scene midpoint
    const keyframe = frames.length > 0
      ? frames.reduce((closest, f) =>
          Math.abs(f.timestamp - mid) < Math.abs(closest.timestamp - mid) ? f : closest
        )
      : undefined

    // Get transcript segments that overlap this scene
    const transcriptSegments = transcript.segments.filter(
      (s) => s.end > start && s.start < end
    )

    scenes.push({
      start,
      end,
      keyframe,
      transcriptSegments,
    })
  }

  return {
    mediaFileId,
    duration,
    scenes,
    transcript,
    createdAt: Date.now(),
  }
}

/**
 * Format a video index summary for the LLM context.
 */
export function formatIndexForLLM(index: VideoIndex): string {
  const parts: string[] = [
    `Video duration: ${index.duration.toFixed(1)}s`,
    `Scenes: ${index.scenes.length}`,
    '',
  ]

  for (const scene of index.scenes) {
    const timeRange = `${scene.start.toFixed(1)}s - ${scene.end.toFixed(1)}s`
    const transcriptText = scene.transcriptSegments.map((s) => s.text).join(' ').trim()
    parts.push(`[${timeRange}]${scene.description ? ` ${scene.description}` : ''}`)
    if (transcriptText) {
      parts.push(`  Transcript: "${transcriptText}"`)
    }
  }

  return parts.join('\n')
}
