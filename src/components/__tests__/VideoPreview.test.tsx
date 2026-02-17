import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VideoPreview } from '../preview/VideoPreview'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { useChatStore } from '@/stores/chat'

describe('VideoPreview', () => {
  beforeEach(() => {
    useUIStore.setState({
      playhead: 0,
      isPlaying: false,
      duration: 0,
    })
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
    useChatStore.setState({
      pendingAttachments: [],
    })
  })

  it('shows empty state when no video loaded', () => {
    render(<VideoPreview />)
    expect(screen.getByText('Import a video to get started')).toBeInTheDocument()
  })

  it('shows drag-and-drop hint in empty state', () => {
    render(<VideoPreview />)
    expect(screen.getByText(/Drag & drop/)).toBeInTheDocument()
  })

  it('renders video element when media file exists', () => {
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: 'blob:http://localhost/test',
      type: 'video',
      duration: 60,
    })
    render(<VideoPreview />)
    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.src).toContain('blob:')
  })

  it('renders capture frame button when video loaded', () => {
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: 'blob:http://localhost/test',
      type: 'video',
      duration: 60,
    })
    render(<VideoPreview />)
    expect(screen.getByTitle('Capture frame for chat')).toBeInTheDocument()
  })

  it('renders controls component when video loaded', () => {
    useProjectStore.getState().addMediaFile({
      name: 'test.mp4',
      path: 'blob:http://localhost/test',
      type: 'video',
      duration: 60,
    })
    useUIStore.setState({ duration: 60 })
    render(<VideoPreview />)
    // Controls renders play button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2) // capture + play + skip buttons
  })

  it('does not render video for audio-only files', () => {
    useProjectStore.getState().addMediaFile({
      name: 'song.mp3',
      path: '/song.mp3',
      type: 'audio',
      duration: 180,
    })
    render(<VideoPreview />)
    // Audio files don't match videoFile = mediaFiles.find(f => f.type === 'video')
    expect(screen.getByText('Import a video to get started')).toBeInTheDocument()
  })
})
