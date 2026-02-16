/// <reference types="vite/client" />

interface ElectronAPI {
  openFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
  ffmpegRun: (args: string[]) => Promise<{ stdout: string; stderr: string }>
  ffprobeRun: (args: string[]) => Promise<{ stdout: string; stderr: string }>
  onFfmpegProgress: (callback: (data: string) => void) => () => void
}

interface Window {
  electronAPI?: ElectronAPI
}
