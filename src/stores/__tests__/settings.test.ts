import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      providers: {},
      activeProvider: 'claude',
    })
  })

  describe('provider config', () => {
    it('defaults to claude as active provider', () => {
      expect(useSettingsStore.getState().activeProvider).toBe('claude')
    })

    it('sets a provider config', () => {
      useSettingsStore.getState().setProviderConfig('claude', {
        apiKey: 'sk-test-123',
        model: 'claude-sonnet-4-5-20250929',
      })

      const config = useSettingsStore.getState().providers.claude
      expect(config?.apiKey).toBe('sk-test-123')
      expect(config?.model).toBe('claude-sonnet-4-5-20250929')
    })

    it('sets multiple provider configs', () => {
      useSettingsStore.getState().setProviderConfig('claude', {
        apiKey: 'sk-claude',
        model: 'claude-sonnet-4-5-20250929',
      })
      useSettingsStore.getState().setProviderConfig('openai', {
        apiKey: 'sk-openai',
        model: 'gpt-4o',
      })

      expect(useSettingsStore.getState().providers.claude?.apiKey).toBe('sk-claude')
      expect(useSettingsStore.getState().providers.openai?.apiKey).toBe('sk-openai')
    })

    it('removes a provider', () => {
      useSettingsStore.getState().setProviderConfig('openai', {
        apiKey: 'sk-openai',
        model: 'gpt-4o',
      })
      useSettingsStore.getState().removeProvider('openai')

      expect(useSettingsStore.getState().providers.openai).toBeUndefined()
    })
  })

  describe('active provider', () => {
    it('switches active provider', () => {
      useSettingsStore.getState().setActiveProvider('gemini')
      expect(useSettingsStore.getState().activeProvider).toBe('gemini')
    })

    it('getActiveConfig returns null when no config set', () => {
      const config = useSettingsStore.getState().getActiveConfig()
      expect(config).toBeNull()
    })

    it('getActiveConfig returns the active provider config', () => {
      useSettingsStore.getState().setProviderConfig('claude', {
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-5-20250929',
      })

      const config = useSettingsStore.getState().getActiveConfig()
      expect(config?.apiKey).toBe('sk-test')
    })

    it('getActiveConfig follows active provider changes', () => {
      useSettingsStore.getState().setProviderConfig('claude', {
        apiKey: 'sk-claude',
        model: 'claude-sonnet-4-5-20250929',
      })
      useSettingsStore.getState().setProviderConfig('openai', {
        apiKey: 'sk-openai',
        model: 'gpt-4o',
      })

      useSettingsStore.getState().setActiveProvider('openai')
      expect(useSettingsStore.getState().getActiveConfig()?.apiKey).toBe('sk-openai')
    })
  })
})
