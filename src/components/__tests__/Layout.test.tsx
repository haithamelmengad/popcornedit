import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SimpleView } from '../layout/SimpleView'
import { EditorView } from '../layout/EditorView'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'
import { useChatStore } from '@/stores/chat'
import { useHistoryStore } from '@/stores/history'

describe('SimpleView', () => {
  beforeEach(() => {
    useUIStore.setState({ playhead: 0, isPlaying: false, duration: 0 })
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useChatStore.setState({ messages: [], isAgentThinking: false, pendingAttachments: [] })
  })

  it('renders video preview area', () => {
    render(<SimpleView />)
    // Empty state shows "Import a video to get started"
    expect(screen.getByText('Import a video to get started')).toBeInTheDocument()
  })

  it('renders chat area', () => {
    render(<SimpleView />)
    // Chat empty state
    expect(screen.getByText('Popcorn')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe your edit...')).toBeInTheDocument()
  })
})

describe('EditorView', () => {
  beforeEach(() => {
    useUIStore.setState({ playhead: 0, isPlaying: false, duration: 0, timelineZoom: 100, timelineScrollX: 0 })
    useProjectStore.setState({ mediaFiles: [], timeline: { tracks: [], duration: 0 } })
    useChatStore.setState({ messages: [], isAgentThinking: false, pendingAttachments: [] })
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
  })

  it('renders video preview area', () => {
    render(<EditorView />)
    expect(screen.getByText('Import a video to get started')).toBeInTheDocument()
  })

  it('renders chat area', () => {
    render(<EditorView />)
    expect(screen.getByPlaceholderText('Describe your edit...')).toBeInTheDocument()
  })

  it('renders history panel', () => {
    render(<EditorView />)
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('renders timeline area', () => {
    render(<EditorView />)
    expect(screen.getByText('Import a video to see the timeline')).toBeInTheDocument()
  })
})
