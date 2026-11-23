# Popcorn

An AI video editor. You describe the edit in plain words, and an agent makes it on the timeline.

> "Cut the first ten seconds, speed up the middle part to 2x, and fade the audio out at the end."

Popcorn runs as a desktop app (Electron) and in the browser. It works with Claude, OpenAI and Gemini, with your own API key.

**Status:** early. The agent, the timeline and undo work. See [What does not work yet](#what-does-not-work-yet) before you rely on it.

## Quick start

You need Node 22 (Node 20.19 or newer works) and, for export, [FFmpeg](https://ffmpeg.org/download.html) on your PATH.

```bash
npm install
npm run dev            # browser, http://localhost:3000
npm run dev:electron   # desktop app
```

Then:

1. Click the gear icon and add an API key for Claude, OpenAI or Gemini.
2. Drop a video on the window, or click **Import**.
3. Type the edit you want in the chat.

Keys are saved in the app's local storage on your computer. Requests go straight from the app to the provider you chose.

## What the agent can do

| Tool | What it does |
|------|--------------|
| `get_timeline` | Reads tracks, clips and durations |
| `cut` | Removes a time range and closes the gap |
| `trim` | Changes where a clip starts or ends in its source |
| `split` | Splits a clip in two at a time |
| `speed` | Changes the playback speed of a clip |
| `volume` | Sets the volume of a clip or a track |
| `fade_audio` | Adds an audio fade in or fade out |
| `move_clip` | Moves a clip in time or to another track |
| `duplicate_clip` | Copies a clip |
| `delete_clip` | Removes a clip |
| `add_track` | Adds a video or audio track |
| `export` | Renders the timeline with FFmpeg (desktop app only) |
| `analyze_video` | Returns sample times for a video (see limits below) |

Every edit is one step in the history panel. You can undo it, redo it, or click a step to go back to it.

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| Space | Play or pause |
| Left / Right | Move the playhead 1 second (5 seconds with Shift) |
| Cmd+Z / Cmd+Shift+Z | Undo / redo |
| Cmd+D | Duplicate the selected clip |
| Delete | Delete the selected clip |
| Cmd+S / Cmd+O | Save / open a `.popcorn` project |

## What does not work yet

- **The preview plays the source file.** Edits show on the timeline and in the export, but not in the preview player.
- **The agent cannot see or hear the video.** `analyze_video` returns sample times only. Captured frames are sent as a time, not as an image, and there is no transcript.
- **Export uses the first video track only**, joins clips end to end, and needs a file with an audio stream. It needs a real file path, so a file dropped on the window cannot be exported.
- **Edits with Gemini 3 and 4 models can fail.** Google requires thought signatures to be sent back with tool calls, and the app does not do that yet.
- **One video per project** in the preview.
- **A saved project does not keep the video in the browser.** It stores a temporary link that stops working when the tab closes.

## Development

```bash
npm test         # 324 tests (Vitest)
npm run build    # type check and production build
```

Stack: Electron, React 19, TypeScript, Vite, Tailwind, Zustand. The code layout, the data types and the rules for adding a tool are in [CLAUDE.md](CLAUDE.md).

To add a tool: write a class that extends `BaseTool` in `src/agent/tools/`, register it in `src/agent/tools/index.ts`, and record a history step with `pushAction` so the edit can be undone.

## Licence

MIT. See [LICENSE](LICENSE).
