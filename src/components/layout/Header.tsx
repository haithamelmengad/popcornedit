import React, { useCallback } from 'react'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { Settings, PanelLeftOpen, PanelLeftClose, Import } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { viewMode, setViewMode, setSettingsOpen, setDuration } = useUIStore()
  const { addMediaFile, addTrack, addClip } = useProjectStore()

  const handleImport = useCallback(async () => {
    // In Electron, use native dialog
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.openFile) {
      const filePath = await electronAPI.openFile()
      if (!filePath) return
      importFile(filePath)
      return
    }

    // In browser, use file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*,audio/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      importFile(url, file.name)
    }
    input.click()
  }, [])

  const importFile = useCallback(
    (path: string, name?: string) => {
      // Create a temporary video element to get metadata
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const duration = video.duration
        const width = video.videoWidth
        const height = video.videoHeight

        const mediaFile = addMediaFile({
          name: name || path.split('/').pop() || 'video',
          path,
          type: 'video',
          duration,
          width,
          height,
        })

        // Create a default track + clip for the imported video
        const track = addTrack({
          name: 'Video 1',
          type: 'video',
          clips: [],
          muted: false,
          volume: 1,
          height: 48,
        })

        addClip(track.id, {
          mediaFileId: mediaFile.id,
          startInTimeline: 0,
          startInSource: 0,
          endInSource: duration,
          duration,
          speed: 1,
          volume: 1,
        })

        setDuration(duration)
      }
      video.src = path
    },
    [addMediaFile, addTrack, addClip, setDuration]
  )

  return (
    <header className="h-11 flex items-center justify-between px-3 border-b border-border bg-card titlebar-drag">
      <div className="flex items-center gap-2 titlebar-no-drag">
        <span className="text-sm font-semibold tracking-tight">Popcorn</span>
      </div>

      <div className="flex items-center gap-1 titlebar-no-drag">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleImport}>
          <Import className="h-3.5 w-3.5" />
          Import
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setViewMode(viewMode === 'simple' ? 'editor' : 'simple')}
        >
          {viewMode === 'simple' ? (
            <>
              <PanelLeftOpen className="h-3.5 w-3.5" />
              Expand
            </>
          ) : (
            <>
              <PanelLeftClose className="h-3.5 w-3.5" />
              Simple
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  )
}
