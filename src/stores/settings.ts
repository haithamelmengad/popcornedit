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
  claude: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-pro',
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
        return providers[activeProvider] || null
      },
    }),
    {
      name: 'popcorn-settings',
    }
  )
)
