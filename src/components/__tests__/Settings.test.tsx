import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../settings/Settings'
import { useSettingsStore } from '@/stores/settings'
import { useUIStore } from '@/stores/ui'

describe('Settings', () => {
  beforeEach(() => {
    useUIStore.setState({ settingsOpen: false })
    useSettingsStore.setState({
      providers: {},
      activeProvider: 'claude',
    })
  })

  it('does not render when closed', () => {
    render(<Settings />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows all three providers', () => {
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)
    expect(screen.getByText('Anthropic (Claude)')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Google (Gemini)')).toBeInTheDocument()
  })

  it('shows Claude as active by default', () => {
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('closes on backdrop click', () => {
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)
    // Click the backdrop (the absolute overlay div)
    const backdrop = document.querySelector('.bg-black\\/60')
    if (backdrop) fireEvent.click(backdrop)
    expect(useUIStore.getState().settingsOpen).toBe(false)
  })

  it('closes on X button click', () => {
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)
    const buttons = screen.getAllByRole('button')
    // First button in the header area should be the close button
    const closeBtn = buttons.find((b) => b.querySelector('.lucide-x'))
    if (closeBtn) fireEvent.click(closeBtn)
    expect(useUIStore.getState().settingsOpen).toBe(false)
  })

  it('updates API key in store on input', async () => {
    const user = userEvent.setup()
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)

    const inputs = screen.getAllByPlaceholderText('API Key')
    // First input should be Claude's
    await user.type(inputs[0], 'sk-test-key')

    expect(useSettingsStore.getState().providers.claude?.apiKey).toBe('sk-test-key')
  })

  it('switches active provider on Use button click', () => {
    useUIStore.setState({ settingsOpen: true })
    render(<Settings />)

    const useButtons = screen.getAllByText('Use')
    // Click "Use" on OpenAI (second provider)
    fireEvent.click(useButtons[0])

    expect(useSettingsStore.getState().activeProvider).toBe('openai')
  })
})
