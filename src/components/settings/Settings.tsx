import React from 'react'
import { useSettingsStore, DEFAULT_MODELS } from '@/stores/settings'
import { useUIStore } from '@/stores/ui'
import type { ProviderType } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROVIDERS: { id: ProviderType; name: string; models: string[] }[] = [
  {
    id: 'claude',
    name: 'Anthropic (Claude)',
    models: ['claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
  },
  {
    id: 'gemini',
    name: 'Google (Gemini)',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
]

export function Settings() {
  const { providers, activeProvider, setProviderConfig, setActiveProvider } = useSettingsStore()
  const { settingsOpen, setSettingsOpen } = useUIStore()

  if (!settingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setSettingsOpen(false)} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">AI Provider</h3>
            <div className="space-y-4">
              {PROVIDERS.map((provider) => {
                const config = providers[provider.id]
                const isActive = activeProvider === provider.id
                return (
                  <div
                    key={provider.id}
                    className={cn(
                      'border rounded-lg p-4 transition-colors',
                      isActive ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">{provider.name}</span>
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setActiveProvider(provider.id)}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Active
                          </>
                        ) : (
                          'Use'
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="API Key"
                        value={config?.apiKey || ''}
                        onChange={(e) =>
                          setProviderConfig(provider.id, {
                            apiKey: e.target.value,
                            model: config?.model || DEFAULT_MODELS[provider.id],
                          })
                        }
                        className="h-8 text-xs"
                      />
                      <select
                        value={config?.model || DEFAULT_MODELS[provider.id]}
                        onChange={(e) =>
                          setProviderConfig(provider.id, {
                            apiKey: config?.apiKey || '',
                            model: e.target.value,
                          })
                        }
                        className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {provider.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
