import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '../layout/Header'
import { useUIStore } from '@/stores/ui'
import { useProjectStore } from '@/stores/project'

describe('Header', () => {
  beforeEach(() => {
    useUIStore.setState({
      viewMode: 'simple',
      settingsOpen: false,
      duration: 0,
    })
    useProjectStore.setState({
      mediaFiles: [],
      timeline: { tracks: [], duration: 0 },
    })
  })

  it('renders the app name', () => {
    render(<Header />)
    expect(screen.getByText('Popcorn')).toBeInTheDocument()
  })

  it('renders Import button', () => {
    render(<Header />)
    expect(screen.getByText('Import')).toBeInTheDocument()
  })

  it('shows Expand button in simple mode', () => {
    render(<Header />)
    expect(screen.getByText('Expand')).toBeInTheDocument()
  })

  it('shows Simple button in editor mode', () => {
    useUIStore.setState({ viewMode: 'editor' })
    render(<Header />)
    expect(screen.getByText('Simple')).toBeInTheDocument()
  })

  it('toggles view mode on button click', () => {
    render(<Header />)
    fireEvent.click(screen.getByText('Expand'))
    expect(useUIStore.getState().viewMode).toBe('editor')
  })

  it('opens settings on gear button click', () => {
    render(<Header />)
    const buttons = screen.getAllByRole('button')
    // Settings button is the last one
    fireEvent.click(buttons[buttons.length - 1])
    expect(useUIStore.getState().settingsOpen).toBe(true)
  })
})
