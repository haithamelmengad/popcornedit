import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportProgress } from '../ExportProgress'
import { useUIStore } from '@/stores/ui'

describe('ExportProgress', () => {
  beforeEach(() => {
    useUIStore.setState({
      isExporting: false,
      exportProgress: 0,
      exportError: null,
    })
  })

  it('renders nothing when not exporting and no error', () => {
    const { container } = render(<ExportProgress />)
    expect(container.innerHTML).toBe('')
  })

  it('shows progress bar when exporting', () => {
    useUIStore.setState({ isExporting: true, exportProgress: 0.5 })
    render(<ExportProgress />)
    expect(screen.getByText('Exporting...')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows 0% at start of export', () => {
    useUIStore.setState({ isExporting: true, exportProgress: 0 })
    render(<ExportProgress />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows "Export complete" at 100%', () => {
    useUIStore.setState({ isExporting: true, exportProgress: 1 })
    render(<ExportProgress />)
    expect(screen.getByText('Export complete')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows error message when export fails', () => {
    useUIStore.setState({ isExporting: false, exportError: 'FFmpeg not found' })
    render(<ExportProgress />)
    expect(screen.getByText('Export failed')).toBeInTheDocument()
    expect(screen.getByText('FFmpeg not found')).toBeInTheDocument()
  })

  it('dismisses error on button click', () => {
    useUIStore.setState({ isExporting: false, exportError: 'Some error' })
    render(<ExportProgress />)
    fireEvent.click(screen.getByText('Dismiss'))
    expect(useUIStore.getState().exportError).toBeNull()
  })

  it('shows progress bar with correct width', () => {
    useUIStore.setState({ isExporting: true, exportProgress: 0.75 })
    render(<ExportProgress />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })
})
