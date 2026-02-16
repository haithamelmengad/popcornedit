import React from 'react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Chat() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <MessageList />
      </ScrollArea>
      <MessageInput />
    </div>
  )
}
