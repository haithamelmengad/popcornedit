/**
 * Platform abstraction layer.
 * Detects Electron vs browser and routes calls accordingly.
 */

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI
}

export async function openFileDialog(): Promise<string | null> {
  if (isElectron()) {
    return window.electronAPI!.openFile()
  }
  // Browser fallback: use file input
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*,audio/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resolve(URL.createObjectURL(file))
    }
    input.click()
  })
}

export async function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  if (isElectron()) {
    return window.electronAPI!.ffmpegRun(args)
  }
  throw new Error('FFmpeg is not available in browser mode. Use Electron for export.')
}

export async function runFFprobe(args: string[]): Promise<{ stdout: string; stderr: string }> {
  if (isElectron()) {
    return window.electronAPI!.ffprobeRun(args)
  }
  throw new Error('FFprobe is not available in browser mode. Use Electron for media analysis.')
}

export function onFFmpegProgress(callback: (data: string) => void): () => void {
  if (isElectron()) {
    return window.electronAPI!.onFfmpegProgress(callback)
  }
  return () => {}
}
