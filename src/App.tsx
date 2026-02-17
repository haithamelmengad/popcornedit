import React, { useEffect, useCallback } from 'react'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { Header } from '@/components/layout/Header'
import { SimpleView } from '@/components/layout/SimpleView'
import { EditorView } from '@/components/layout/EditorView'
import { Settings } from '@/components/settings/Settings'
import { ExportProgress } from '@/components/ExportProgress'
import { saveProject, loadProject } from '@/lib/project-file'

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
    const isTextField = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'textarea' || tag === 'input' || el.isContentEditable
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Space → play/pause (not in text fields)
      if (e.code === 'Space' && !isTextField(e.target)) {
        e.preventDefault()
        const { isPlaying, setIsPlaying } = useUIStore.getState()
        setIsPlaying(!isPlaying)
        return
      }

      // Cmd+Z → undo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useHistoryStore.getState().undo()
        return
      }

      // Cmd+Shift+Z → redo
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        useHistoryStore.getState().redo()
        return
      }

      // Cmd+S → save project
      if (mod && e.key === 's') {
        e.preventDefault()
        saveProject()
        return
      }

      // Cmd+O → load project
      if (mod && e.key === 'o') {
        e.preventDefault()
        loadProject()
        return
      }

      // Cmd+D → duplicate selected clip
      if (mod && e.key === 'd') {
        e.preventDefault()
        const clipId = useUIStore.getState().selectedClipId
        if (clipId) {
          const { DuplicateClipTool } = require('@/agent/tools/duplicate-clip')
          new DuplicateClipTool().execute({ clipId })
        }
        return
      }

      // Delete/Backspace → delete selected clip (not in text fields)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTextField(e.target)) {
        e.preventDefault()
        const clipId = useUIStore.getState().selectedClipId
        if (clipId) {
          const { DeleteClipTool } = require('@/agent/tools/delete-clip')
          new DeleteClipTool().execute({ clipId })
          useUIStore.getState().selectClip(null)
        }
        return
      }

      // Left/Right arrows → scrub playhead (not in text fields)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isTextField(e.target)) {
        e.preventDefault()
        const { playhead, setPlayhead, duration } = useUIStore.getState()
        const step = e.shiftKey ? 5 : 1 // Shift for bigger jumps
        const delta = e.key === 'ArrowLeft' ? -step : step
        setPlayhead(Math.max(0, Math.min(duration, playhead + delta)))
        return
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
      <ExportProgress />
    </>
  )
}
