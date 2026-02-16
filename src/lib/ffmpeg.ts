/**
 * FFmpeg command builder.
 * Generates ffmpeg CLI arguments for common video editing operations.
 */

import type { Timeline, Track, Clip } from './types'

export interface ExportOptions {
  outputPath: string
  format?: 'mp4' | 'webm' | 'mov'
  quality?: 'low' | 'medium' | 'high' | 'lossless'
  width?: number
  height?: number
  fps?: number
}

const QUALITY_MAP = {
  low: { crf: '28', preset: 'fast' },
  medium: { crf: '23', preset: 'medium' },
  high: { crf: '18', preset: 'slow' },
  lossless: { crf: '0', preset: 'veryslow' },
}

/**
 * Build an FFmpeg filter_complex + command for exporting the full timeline.
 * Handles: trim, speed, volume, fade, concatenation of clips per track.
 */
export function buildExportCommand(
  timeline: Timeline,
  mediaFilePaths: Map<string, string>,
  options: ExportOptions
): string[] {
  const args: string[] = ['-y'] // overwrite output
  const inputs: string[] = []
  const inputIndex = new Map<string, number>()

  // Collect unique input files
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      const path = mediaFilePaths.get(clip.mediaFileId)
      if (path && !inputIndex.has(clip.mediaFileId)) {
        inputIndex.set(clip.mediaFileId, inputs.length)
        inputs.push(path)
      }
    }
  }

  // Add inputs
  for (const input of inputs) {
    args.push('-i', input)
  }

  if (inputs.length === 0) {
    return args
  }

  // Build filter complex
  const filterParts: string[] = []
  const concatInputs: string[] = []
  let filterIndex = 0

  // Process video tracks only for now (first video track)
  const videoTrack = timeline.tracks.find((t) => t.type === 'video')
  if (videoTrack && videoTrack.clips.length > 0) {
    const sortedClips = [...videoTrack.clips].sort((a, b) => a.startInTimeline - b.startInTimeline)

    for (const clip of sortedClips) {
      const idx = inputIndex.get(clip.mediaFileId)
      if (idx === undefined) continue

      const label = `v${filterIndex}`
      const alabel = `a${filterIndex}`
      const parts = buildClipFilter(clip, idx, label, alabel)
      filterParts.push(...parts)
      concatInputs.push(`[${label}]`, `[${alabel}]`)
      filterIndex++
    }

    if (concatInputs.length > 0) {
      const n = concatInputs.length / 2
      filterParts.push(
        `${concatInputs.join('')}concat=n=${n}:v=1:a=1[outv][outa]`
      )
    }
  }

  if (filterParts.length > 0) {
    args.push('-filter_complex', filterParts.join(';'))
    args.push('-map', '[outv]', '-map', '[outa]')
  }

  // Output codec settings
  const quality = QUALITY_MAP[options.quality || 'medium']
  const format = options.format || 'mp4'

  if (format === 'mp4' || format === 'mov') {
    args.push('-c:v', 'libx264', '-crf', quality.crf, '-preset', quality.preset)
    args.push('-c:a', 'aac', '-b:a', '192k')
  } else if (format === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-crf', quality.crf, '-b:v', '0')
    args.push('-c:a', 'libopus', '-b:a', '192k')
  }

  if (options.fps) {
    args.push('-r', String(options.fps))
  }

  args.push(options.outputPath)
  return args
}

/**
 * Build filter chain for a single clip: trim → speed → volume → fade
 */
function buildClipFilter(
  clip: Clip,
  inputIndex: number,
  videoLabel: string,
  audioLabel: string
): string[] {
  const filters: string[] = []
  const vFilters: string[] = []
  const aFilters: string[] = []

  // Trim
  vFilters.push(`trim=start=${clip.startInSource}:end=${clip.endInSource}`)
  vFilters.push('setpts=PTS-STARTPTS')
  aFilters.push(`atrim=start=${clip.startInSource}:end=${clip.endInSource}`)
  aFilters.push('asetpts=PTS-STARTPTS')

  // Speed change
  if (clip.speed !== 1) {
    vFilters.push(`setpts=PTS/${clip.speed}`)
    aFilters.push(`atempo=${clampAtempo(clip.speed)}`)
  }

  // Volume
  if (clip.volume !== 1) {
    aFilters.push(`volume=${clip.volume}`)
  }

  // Fade
  if (clip.fadeIn && clip.fadeIn > 0) {
    aFilters.push(`afade=t=in:d=${clip.fadeIn}`)
  }
  if (clip.fadeOut && clip.fadeOut > 0) {
    aFilters.push(`afade=t=out:st=${clip.duration - clip.fadeOut}:d=${clip.fadeOut}`)
  }

  filters.push(`[${inputIndex}:v]${vFilters.join(',')}[${videoLabel}]`)
  filters.push(`[${inputIndex}:a]${aFilters.join(',')}[${audioLabel}]`)

  return filters
}

/**
 * atempo filter only supports 0.5-100. For extreme values, chain multiple atempo filters.
 * For simplicity, we clamp to supported range.
 */
function clampAtempo(speed: number): string {
  if (speed >= 0.5 && speed <= 100) return String(speed)
  if (speed < 0.5) return '0.5'
  return '100'
}

/**
 * Build a simple trim/cut command for a single file (quick export).
 */
export function buildTrimCommand(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  endSeconds: number
): string[] {
  return [
    '-y',
    '-i', inputPath,
    '-ss', String(startSeconds),
    '-to', String(endSeconds),
    '-c', 'copy',
    outputPath,
  ]
}

/**
 * Build an ffprobe command to get media info as JSON.
 */
export function buildProbeCommand(inputPath: string): string[] {
  return [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    inputPath,
  ]
}

/**
 * Build command to extract a frame at a given timestamp.
 */
export function buildFrameExtractCommand(
  inputPath: string,
  outputPath: string,
  timestampSeconds: number,
  width?: number
): string[] {
  const args = [
    '-y',
    '-ss', String(timestampSeconds),
    '-i', inputPath,
    '-vframes', '1',
  ]
  if (width) {
    args.push('-vf', `scale=${width}:-1`)
  }
  args.push(outputPath)
  return args
}
