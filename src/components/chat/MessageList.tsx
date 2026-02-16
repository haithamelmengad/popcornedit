import React, { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat'
import { formatTime } from '@/lib/time'
import { Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const isAgentThinking = useChatStore((s) => s.isAgentThinking)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAgentThinking])

  if (messages.length === 0 && !isAgentThinking) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-3xl mb-3">✂️</div>
          <h3 className="text-sm font-medium text-foreground mb-1">Popcorn</h3>
          <p className="text-xs text-muted-foreground max-w-[240px]">
            Describe what you want to edit. I can cut, trim, split, adjust speed, change audio, and more.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
          <div
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
              msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'
            )}
          >
            {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              msg.role === 'assistant'
                ? 'bg-secondary text-foreground'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex gap-2 mb-2">
                {msg.attachments.map((att, i) => (
                  <div key={i} className="relative">
                    <img
                      src={att.thumbnailUrl}
                      alt={`Frame at ${formatTime(att.timestamp)}`}
                      className="h-16 rounded border border-border"
                    />
                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
                      {formatTime(att.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      ))}

      {isAgentThinking && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary/20 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div className="bg-secondary rounded-lg px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
