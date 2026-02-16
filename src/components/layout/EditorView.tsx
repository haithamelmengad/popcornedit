import React from 'react'
import { VideoPreview } from '@/components/preview/VideoPreview'
import { Chat } from '@/components/chat/Chat'
import { Timeline } from '@/components/timeline/Timeline'
import { HistoryPanel } from '@/components/history/HistoryPanel'

export function EditorView() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top: Preview + Chat side by side */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Preview + History */}
        <div className="w-[55%] flex flex-col min-h-0 border-r border-border">
          <div className="flex-1 min-h-0 p-3 pb-0">
            <VideoPreview />
          </div>
          <div className="h-[180px] border-t border-border">
            <HistoryPanel />
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-[45%] min-h-0">
          <Chat />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <Timeline />
    </div>
  )
}
