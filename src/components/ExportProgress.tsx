import React from 'react'
import { useUIStore } from '@/stores/ui'

export function ExportProgress() {
  const isExporting = useUIStore((s) => s.isExporting)
  const progress = useUIStore((s) => s.exportProgress)
  const error = useUIStore((s) => s.exportError)

  if (!isExporting && !error) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg p-3 shadow-lg min-w-[240px]">
      {error ? (
        <div className="text-sm text-destructive">
          <div className="font-medium mb-1">Export failed</div>
          <div className="text-xs text-muted-foreground">{error}</div>
          <button
            className="text-xs mt-2 underline"
            onClick={() => useUIStore.getState().setExportError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">
              {progress >= 1 ? 'Export complete' : 'Exporting...'}
            </span>
            <span className="text-foreground font-mono">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
