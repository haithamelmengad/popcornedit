import React from 'react'
import { useHistoryStore } from '@/stores/history'
import { Undo2, Redo2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export function HistoryPanel() {
  const { actions, currentIndex, undo, redo, canUndo, canRedo, revertTo } = useHistoryStore()

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          History
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canUndo()}
            onClick={undo}
            title="Undo"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canRedo()}
            onClick={redo}
            title="Redo"
          >
            <Redo2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {actions.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center">
            No actions yet. Edits will appear here.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {actions.map((action, i) => (
              <button
                key={action.id}
                onClick={() => revertTo(action.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                  i <= currentIndex
                    ? 'text-foreground hover:bg-accent'
                    : 'text-muted-foreground/50 line-through hover:bg-accent/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3 w-3 shrink-0" />
                  <span className="truncate">{action.description}</span>
                </div>
                <div className="text-[10px] text-muted-foreground ml-5">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
