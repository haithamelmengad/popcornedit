import React, { useEffect, useCallback } from 'react'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { Header } from '@/components/layout/Header'
import { SimpleView } from '@/components/layout/SimpleView'
import { EditorView } from '@/components/layout/EditorView'
import { Settings } from '@/components/settings/Settings'

export default function App() {
  const viewMode = useUIStore((s) => s.viewMode)
  const { setDuration } = useUIStore()
  const { addMediaFile, addTrack, addClip } = useProjectStore()

  // Handle file drops
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer?.files[0]
      if (!file || !file.type.startsWith('video/')) return

      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const mediaFile = addMediaFile({
          name: file.name,
          path: url,
          type: 'video',
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        })
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
          endInSource: video.duration,
          duration: video.duration,
          speed: 1,
          volume: 1,
        })
        setDuration(video.duration)
      }
      video.src = url
    },
    [addMediaFile, addTrack, addClip, setDuration]
  )

  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDrop])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Space → play/pause
      if (e.code === 'Space' && !e.target?.toString().includes('textarea')) {
        e.preventDefault()
        const { isPlaying, setIsPlaying } = useUIStore.getState()
        setIsPlaying(!isPlaying)
      }
      // Cmd+Z → undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const { useHistoryStore } = require('@/stores/history')
        useHistoryStore.getState().undo()
      }
      // Cmd+Shift+Z → redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        const { useHistoryStore } = require('@/stores/history')
        useHistoryStore.getState().redo()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <Header />
      {viewMode === 'simple' ? <SimpleView /> : <EditorView />}
      <Settings />
    </>
  )
}
