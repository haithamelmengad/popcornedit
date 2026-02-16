import React, { useCallback } from 'react'
import { useUIStore } from '@/stores/ui'
import { formatTime } from '@/lib/time'
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Controls() {
  const { playhead, isPlaying, duration, setPlayhead, setIsPlaying } = useUIStore()

  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying, setIsPlaying])

  const skipBack = useCallback(() => {
    setPlayhead(Math.max(0, playhead - 5))
  }, [playhead, setPlayhead])

  const skipForward = useCallback(() => {
    setPlayhead(Math.min(duration, playhead + 5))
  }, [playhead, duration, setPlayhead])

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      setPlayhead(time)
    },
    [setPlayhead]
  )

  const handleScrubStart = useCallback(() => {
    // Pause during scrub for smoother seeking
  }, [])

  const progress = duration > 0 ? (playhead / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipBack}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipForward}>
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 relative group">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={playhead}
          onChange={handleScrub}
          onMouseDown={handleScrubStart}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="text-xs text-muted-foreground tabular-nums min-w-[80px] text-right">
        {formatTime(playhead)} / {formatTime(duration)}
      </div>

      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Volume2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
