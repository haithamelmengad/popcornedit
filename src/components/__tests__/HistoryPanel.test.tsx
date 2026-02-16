import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPanel } from '../history/HistoryPanel'
import { useHistoryStore } from '@/stores/history'
import { useProjectStore } from '@/stores/project'

describe('HistoryPanel', () => {
  const makeSnapshot = (label: string) => ({
    tracks: [{ id: 't1', name: label, type: 'video' as const, clips: [], muted: false, volume: 1, height: 48 }],
    duration: 0,
  })

  beforeEach(() => {
    useHistoryStore.setState({ actions: [], currentIndex: -1 })
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
  })

  it('shows empty state when no actions', () => {
    render(<HistoryPanel />)
    expect(screen.getByText(/No actions yet/)).toBeInTheDocument()
  })

  it('shows History label', () => {
    render(<HistoryPanel />)
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('renders action items', () => {
    useHistoryStore.getState().pushAction('cut', 'Cut 1:00-2:00', makeSnapshot('a'), makeSnapshot('b'))
    useHistoryStore.getState().pushAction('trim', 'Trim intro to 5s', makeSnapshot('b'), makeSnapshot('c'))

    render(<HistoryPanel />)
    expect(screen.getByText('Cut 1:00-2:00')).toBeInTheDocument()
    expect(screen.getByText('Trim intro to 5s')).toBeInTheDocument()
  })

  it('has undo and redo buttons', () => {
    render(<HistoryPanel />)
    const buttons = screen.getAllByRole('button')
    // Should have undo and redo buttons (with title attributes)
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('undo button is disabled when nothing to undo', () => {
    render(<HistoryPanel />)
    const undoBtn = screen.getByTitle('Undo')
    expect(undoBtn).toBeDisabled()
  })

  it('undo button is enabled when actions exist', () => {
    useHistoryStore.getState().pushAction('cut', 'Cut', makeSnapshot('a'), makeSnapshot('b'))
    render(<HistoryPanel />)
    const undoBtn = screen.getByTitle('Undo')
    expect(undoBtn).not.toBeDisabled()
  })

  it('clicking an action reverts to that point', () => {
    useHistoryStore.getState().pushAction('cut', 'A1', makeSnapshot('s0'), makeSnapshot('s1'))
    useHistoryStore.getState().pushAction('trim', 'A2', makeSnapshot('s1'), makeSnapshot('s2'))

    render(<HistoryPanel />)
    fireEvent.click(screen.getByText('A1'))

    expect(useHistoryStore.getState().currentIndex).toBe(0)
    expect(useProjectStore.getState().timeline.tracks[0].name).toBe('s1')
  })
})
