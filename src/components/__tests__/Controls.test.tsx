import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Controls } from '../preview/Controls'
import { useUIStore } from '@/stores/ui'

describe('Controls', () => {
  beforeEach(() => {
    useUIStore.setState({
      playhead: 0,
      isPlaying: false,
      duration: 120,
    })
  })

  it('renders play button when paused', () => {
    render(<Controls />)
    // The play button should be present (SVG icons)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3) // skip back, play, skip forward
  })

  it('shows time display', () => {
    useUIStore.setState({ playhead: 65, duration: 120 })
    render(<Controls />)
    expect(screen.getByText('1:05 / 2:00')).toBeInTheDocument()
  })

  it('shows 0:00 when no duration', () => {
    useUIStore.setState({ playhead: 0, duration: 0 })
    render(<Controls />)
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument()
  })

  it('toggles play/pause on button click', () => {
    render(<Controls />)
    const buttons = screen.getAllByRole('button')
    // Play button is the second button (after skip back)
    fireEvent.click(buttons[1])
    expect(useUIStore.getState().isPlaying).toBe(true)

    fireEvent.click(buttons[1])
    expect(useUIStore.getState().isPlaying).toBe(false)
  })

  it('skip back moves playhead by 5 seconds', () => {
    useUIStore.setState({ playhead: 30 })
    render(<Controls />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]) // skip back
    expect(useUIStore.getState().playhead).toBe(25)
  })

  it('skip back does not go below 0', () => {
    useUIStore.setState({ playhead: 2 })
    render(<Controls />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(useUIStore.getState().playhead).toBe(0)
  })

  it('skip forward moves playhead by 5 seconds', () => {
    useUIStore.setState({ playhead: 30, duration: 120 })
    render(<Controls />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2]) // skip forward
    expect(useUIStore.getState().playhead).toBe(35)
  })

  it('skip forward does not exceed duration', () => {
    useUIStore.setState({ playhead: 118, duration: 120 })
    render(<Controls />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2])
    expect(useUIStore.getState().playhead).toBe(120)
  })
})
