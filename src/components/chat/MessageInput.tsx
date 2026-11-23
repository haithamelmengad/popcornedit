import React, { useState, useRef, useCallback } from 'react'
import { useChatStore } from '@/stores/chat'
import { runAgent } from '@/agent/agent'
import { formatTime } from '@/lib/time'
import { Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MessageInput() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addMessage, isAgentThinking, pendingAttachments, removePendingAttachment, clearPendingAttachments } =
    useChatStore()

  const handleSubmit = useCallback(() => {
    const text = input.trim()
    if (!text && pendingAttachments.length === 0) return
    if (isAgentThinking) return

    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    addMessage('user', text, attachments)
    clearPendingAttachments()
    setInput('')

    // Run the agent asynchronously
    runAgent(text, attachments).catch((err) => {
      console.error('Agent error:', err)
    })
  }, [input, pendingAttachments, isAgentThinking, addMessage, clearPendingAttachments])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="border-t border-border p-3">
      {pendingAttachments.length > 0 && (
        <div className="flex gap-2 mb-2">
          {pendingAttachments.map((att, i) => (
            <div key={i} className="relative group">
              <img
                src={att.thumbnailUrl}
                alt={`Frame at ${formatTime(att.timestamp)}`}
                className="h-12 rounded border border-border"
              />
              <button
                onClick={() => removePendingAttachment(i)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your edit..."
          rows={1}
          className="flex-1 resize-none bg-secondary rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[36px] max-h-[120px]"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`
          }}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSubmit}
          disabled={isAgentThinking || (!input.trim() && pendingAttachments.length === 0)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
