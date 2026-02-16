import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filters?: Electron.FileFilter[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),
  ffmpegRun: (args: string[]) =>
    ipcRenderer.invoke('ffmpeg:run', args),
  ffprobeRun: (args: string[]) =>
    ipcRenderer.invoke('ffprobe:run', args),
  onFfmpegProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('ffmpeg:progress', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ffmpeg:progress')
  },
})
