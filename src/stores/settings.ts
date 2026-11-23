import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderType, ProviderConfig } from '@/lib/types'

interface SettingsState {
  providers: Partial<Record<ProviderType, ProviderConfig>>
  activeProvider: ProviderType

  setProviderConfig: (provider: ProviderType, config: ProviderConfig) => void
  removeProvider: (provider: ProviderType) => void
  setActiveProvider: (provider: ProviderType) => void
  getActiveConfig: () => ProviderConfig | null
}

const DEFAULT_MODELS: Record<ProviderType, string> = {
  claude: 'claude-sonnet-5-5',
  openai: 'gpt-6.2-sol',
  gemini: 'gemini-4-hydrogen',
}

export { DEFAULT_MODELS }

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providers: {},
      activeProvider: 'claude',

      setProviderConfig: (provider, config) =>
        set((s) => ({
          providers: { ...s.providers, [provider]: config },
        })),

      removeProvider: (provider) =>
        set((s) => {
          const providers = { ...s.providers }
          delete providers[provider]
          return { providers }
        }),

      setActiveProvider: (activeProvider) => set({ activeProvider }),

      getActiveConfig: () => {
        const { providers, activeProvider } = get()
        const config = providers[activeProvider]
        if (!config) return null
        // An empty model field means the default model
        return { ...config, model: config.model?.trim() || DEFAULT_MODELS[activeProvider] }
      },
    }),
    {
      name: 'popcorn-settings',
    }
  )
)
