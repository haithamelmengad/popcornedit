/**
 * Transcript extraction.
 * Electron: stubs for Whisper integration (user provides whisper binary).
 * Browser: uses Web Speech API as fallback (limited).
 */

export interface TranscriptSegment {
  text: string
  start: number   // seconds
  end: number     // seconds
}

export interface Transcript {
  segments: TranscriptSegment[]
  fullText: string
  language?: string
}

/**
 * Placeholder for Whisper-based transcription.
 * In a full implementation, this would call whisper via IPC in Electron.
 */
export async function transcribeVideo(
  _videoPath: string,
  _language?: string
): Promise<Transcript> {
  // TODO: Implement Whisper integration via Electron IPC
  // For now, return empty transcript
  return {
    segments: [],
    fullText: '',
    language: _language || 'en',
  }
}

/**
 * Search transcript segments for a query string.
 * Returns segments whose text contains the query (case-insensitive).
 */
export function searchTranscript(
  transcript: Transcript,
  query: string
): TranscriptSegment[] {
  const lower = query.toLowerCase()
  return transcript.segments.filter((s) =>
    s.text.toLowerCase().includes(lower)
  )
}

/**
 * Get transcript text for a specific time range.
 */
export function getTranscriptInRange(
  transcript: Transcript,
  start: number,
  end: number
): TranscriptSegment[] {
  return transcript.segments.filter(
    (s) => s.end > start && s.start < end
  )
}
