import React from 'react'
import { VideoPreview } from '@/components/preview/VideoPreview'
import { Chat } from '@/components/chat/Chat'

export function SimpleView() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 p-3 pb-0">
        <VideoPreview />
      </div>
      <div className="h-[45%] min-h-[200px] border-t border-border">
        <Chat />
      </div>
    </div>
  )
}
