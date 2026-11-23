/**
 * Frame sampler — extract frames from a video at given timestamps, using a canvas.
 */

export interface SampledFrame {
  timestamp: number     // seconds
  dataUrl: string       // base64 JPEG data URL
  width: number
  height: number
}

/**
 * Extract frames at the given timestamps from a <video> element using canvas.
 * Works in both browser and Electron renderer.
 */
export async function sampleFramesFromVideo(
  videoElement: HTMLVideoElement,
  timestamps: number[],
  width = 320
): Promise<SampledFrame[]> {
  const frames: SampledFrame[] = []

  for (const ts of timestamps) {
    const frame = await extractFrameAt(videoElement, ts, width)
    if (frame) frames.push(frame)
  }

  return frames
}

/**
 * Seek video to a timestamp and capture the frame via canvas.
 */
function extractFrameAt(
  video: HTMLVideoElement,
  timestamp: number,
  width: number
): Promise<SampledFrame | null> {
  return new Promise((resolve) => {
    const previousTime = video.currentTime
    const wasPaused = video.paused

    video.currentTime = Math.min(timestamp, video.duration || timestamp)

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)

      const canvas = document.createElement('canvas')
      const scale = width / (video.videoWidth || width)
      canvas.width = width
      canvas.height = Math.round((video.videoHeight || 180) * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

      // Restore original position
      video.currentTime = previousTime
      if (!wasPaused) video.play()

      resolve({
        timestamp,
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      })
    }

    video.addEventListener('seeked', onSeeked)
  })
}

/**
 * Generate evenly-spaced timestamps for sampling a video.
 * @param duration Total video duration in seconds
 * @param count Number of frames to sample
 * @param startTime Start of range (default 0)
 * @param endTime End of range (default duration)
 */
export function generateSampleTimestamps(
  duration: number,
  count: number,
  startTime = 0,
  endTime?: number
): number[] {
  const end = endTime ?? duration
  if (count <= 0 || end <= startTime) return []
  if (count === 1) return [startTime + (end - startTime) / 2]

  const step = (end - startTime) / (count - 1)
  const timestamps: number[] = []
  for (let i = 0; i < count; i++) {
    timestamps.push(startTime + step * i)
  }
  return timestamps
}
