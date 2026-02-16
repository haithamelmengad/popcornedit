import React, { useRef, useEffect, useCallback } from 'react'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { useChatStore } from '@/stores/chat'
import { Controls } from './Controls'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { playhead, isPlaying, setPlayhead, setIsPlaying, setDuration } = useUIStore()
  const mediaFiles = useProjectStore((s) => s.mediaFiles)
  const addPendingAttachment = useChatStore((s) => s.addPendingAttachment)

  const videoFile = mediaFiles.find((f) => f.type === 'video')
  const videoSrc = videoFile?.path || null

  // Sync playhead → video
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    if (Math.abs(video.currentTime - playhead) > 0.1) {
      video.currentTime = playhead
    }
  }, [playhead, videoSrc])

  // Sync video → playhead during playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => setPlayhead(video.currentTime)
    const onLoadedMetadata = () => setDuration(video.duration)
    const onEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('ended', onEnded)
    }
  }, [setPlayhead, setDuration, setIsPlaying])

  // Play/pause sync
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [isPlaying, videoSrc, setIsPlaying])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || !videoFile) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
    addPendingAttachment({
      mediaFileId: videoFile.id,
      timestamp: video.currentTime,
      thumbnailUrl,
    })
  }, [videoFile, addPendingAttachment])

  if (!videoSrc) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black/50 rounded-lg border border-border">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm">Import a video to get started</p>
          <p className="text-xs mt-1 text-muted-foreground/60">
            Drag & drop or use File → Import
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 relative bg-black rounded-lg overflow-hidden min-h-0">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          playsInline
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white h-8 w-8"
          onClick={captureFrame}
          title="Capture frame for chat"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      <Controls />
    </div>
  )
}
