# CLAUDE.md — Popcorn

Agent documentation for building and maintaining the Popcorn video editor.

## Project Overview

**Popcorn** is an AI-native video editor — "Cursor for video editing." It combines a professional timeline with an AI agent that executes edits from natural language. Built with Electron + React for desktop, same React app deploys to browser.

**Full plan:** `/Users/haithamelmengad/.claude/plans/vivid-snuggling-reddy.md`

## Commands

```bash
npm run dev          # Vite dev server (browser mode, port 3000)
npm run dev:electron # Vite + Electron dev mode
npm run build        # TypeScript check + Vite production build
npm test             # Run all tests (vitest run)
npm run test:watch   # Watch mode (vitest)
npm run test:coverage # With coverage report
```

**Always run `npm test` after making changes.** All 309 tests must pass before committing. Use Node 22 (`.nvmrc`); the dev server does not work on Node 18.

## Architecture

**Stack:** Electron 34 + React 19 + TypeScript + Vite 6 + Tailwind CSS 3 + Zustand 5 + shadcn/ui (Radix)

**Path alias:** `@/*` → `./src/*` (configured in tsconfig.json and vitest.config.ts)

### Directory Structure

```
popcorn/
├── electron/               # Electron main process
│   ├── main.ts            # Window creation, IPC handlers (ffmpeg, ffprobe, dialog)
│   └── preload.ts         # Context bridge (electronAPI)
├── src/
│   ├── App.tsx            # Root: drag-drop, keyboard shortcuts, view routing
│   ├── main.tsx           # React entry
│   ├── index.css          # Tailwind + CSS variables (dark theme)
│   ├── components/
│   │   ├── layout/        # SimpleView, EditorView, Header
│   │   ├── preview/       # VideoPreview (HTML5 video), Controls (play/scrub)
│   │   ├── chat/          # Chat, MessageList, MessageInput
│   │   ├── timeline/      # Timeline (canvas-based, animated playhead, click-to-seek)
│   │   ├── history/       # HistoryPanel (undo/redo actions)
│   │   ├── settings/      # Settings modal (API keys, provider select)
│   │   └── ui/            # shadcn/ui primitives (button, input, etc.)
│   ├── stores/            # Zustand state management
│   │   ├── project.ts     # Media files, tracks, clips, timeline
│   │   ├── ui.ts          # View mode, playhead, zoom, selection
│   │   ├── settings.ts    # API keys, active provider (persisted)
│   │   ├── chat.ts        # Messages, attachments, agent thinking
│   │   └── history.ts     # Action stack (undo/redo via snapshots)
│   ├── agent/
│   │   ├── agent.ts       # Core agent loop (stream + tool call loop)
│   │   ├── providers/     # LLM adapters: claude.ts, openai.ts, gemini.ts
│   │   ├── tools/         # 13 editing tools (see tool list below)
│   │   └── video-understanding/
│   │       ├── frame-sampler.ts  # Extract frames via canvas or FFmpeg
│   │       ├── transcript.ts     # Whisper integration (stub) + search
│   │       └── indexer.ts        # Build video index (scenes + transcript)
│   ├── lib/
│   │   ├── types.ts       # All TypeScript interfaces
│   │   ├── time.ts        # formatTime, formatTimecode, parseTimecode
│   │   ├── utils.ts       # cn() helper
│   │   ├── ffmpeg.ts      # FFmpeg command builder (export, trim, probe, frame extract)
│   │   ├── platform.ts    # Platform abstraction (Electron IPC vs browser)
│   │   └── project-file.ts # .popcorn project save/load (serialize/deserialize)
│   └── test/
│       ├── setup.ts       # Test mocks (ResizeObserver, canvas, media)
│       └── integration/   # Multi-store workflow tests
├── vitest.config.ts       # Test config (happy-dom, globals, aliases)
├── vite.config.ts         # Build config (react-swc, electron plugin)
├── tailwind.config.ts     # Theme with HSL CSS variables
└── tsconfig.json          # Strict mode, bundler resolution
```

### Key Data Types (src/lib/types.ts)

- `MediaFile` — imported video/audio files
- `Track` — timeline row (video or audio type)
- `Clip` — segment on a track (references a MediaFile, has startInTimeline, duration, speed, volume, fadeIn, fadeOut)
- `Action` — undo/redo entry with snapshotBefore and snapshotAfter
- `AgentMessage` — chat message with optional FrameAttachments
- `Settings` — provider configs (apiKey + model per provider)

### Stores

| Store | Key Concepts |
|-------|-------------|
| `project` | addMediaFile, addTrack/addClip/removeClip/updateClip, getTimelineSnapshot/restoreTimeline |
| `ui` | viewMode (simple/editor), playhead, isPlaying, duration, timelineZoom, selectedClipId, settingsOpen, isExporting, exportProgress, exportError |
| `settings` | providers map, activeProvider, getActiveConfig(). Persisted via zustand/persist |
| `chat` | messages array, addMessage/appendToMessage (streaming), pendingAttachments |
| `history` | actions array + currentIndex. pushAction discards future on new branch. undo/redo restore snapshots |

### Agent Tools (13 total)

| Tool | Description |
|------|-------------|
| `get_timeline` | Read current timeline state (tracks, clips, durations) |
| `cut` | Remove a time range from the timeline |
| `trim` | Adjust clip start/end in source media |
| `split` | Split a clip at a timeline time point |
| `speed` | Change clip playback speed (recalculates duration) |
| `volume` | Adjust clip or track volume |
| `delete_clip` | Remove a clip from the timeline |
| `move_clip` | Move clip to new position or different track |
| `duplicate_clip` | Copy a clip (placed right after original) |
| `add_track` | Add a new empty video or audio track |
| `fade_audio` | Set fade-in/fade-out durations on a clip |
| `export` | Export timeline as video via FFmpeg (Electron only) |
| `analyze_video` | Analyze video content (frame sampling + transcript) |

### Dual Layout

- **SimpleView** — video preview (top) + chat (bottom). Default mode.
- **EditorView** — preview + history (left), chat (right), timeline (bottom strip)
- Toggle via Header button or `useUIStore.setViewMode()`

## Test Structure

**Framework:** Vitest + @testing-library/react + happy-dom

Tests are co-located with source in `__tests__/` directories:

### Unit Tests (lib + stores)
- `src/lib/__tests__/time.test.ts` — formatTime, formatTimecode, parseTimecode edge cases (16 tests)
- `src/lib/__tests__/utils.test.ts` — cn() Tailwind merge behavior (5 tests)
- `src/lib/__tests__/ffmpeg.test.ts` — FFmpeg command builder: export, trim, probe, frame extract (13 tests)
- `src/lib/__tests__/platform.test.ts` — Platform abstraction: Electron detection, browser fallbacks (5 tests)
- `src/lib/__tests__/project-file.test.ts` — Project save/load: serialize, deserialize, roundtrip (10 tests)
- `src/stores/__tests__/project.test.ts` — CRUD for media files, tracks, clips, snapshot/restore (13 tests)
- `src/stores/__tests__/ui.test.ts` — view mode, playhead, zoom, selection, export state (17 tests)
- `src/stores/__tests__/settings.test.ts` — provider config, active provider, persistence (8 tests)
- `src/stores/__tests__/chat.test.ts` — messages, streaming, attachments (11 tests)
- `src/stores/__tests__/history.test.ts` — push/undo/redo/revertTo, branch discard (13 tests)

### UI Component Tests
- `src/components/__tests__/Controls.test.tsx` — play/pause toggle, skip ±5s, time display (8 tests)
- `src/components/__tests__/MessageList.test.tsx` — empty state, messages, attachments, thinking (7 tests)
- `src/components/__tests__/MessageInput.test.tsx` — send button state, Enter key, attachment display (7 tests)
- `src/components/__tests__/HistoryPanel.test.tsx` — empty state, action list, undo/redo buttons, revert click (7 tests)
- `src/components/__tests__/Settings.test.tsx` — open/close, provider cards, API key input, active switch (8 tests)
- `src/components/__tests__/Header.test.tsx` — app name, import button, view toggle, settings open (6 tests)
- `src/components/__tests__/Layout.test.tsx` — SimpleView and EditorView render all expected sections (6 tests)
- `src/components/__tests__/Chat.test.tsx` — Chat container: renders input, empty state, messages, send button (4 tests)
- `src/components/__tests__/ExportProgress.test.tsx` — export progress bar, completion, error states, dismiss (7 tests)
- `src/components/__tests__/VideoPreview.test.tsx` — empty state, drag hint, video element, capture button, audio-only, playback sync (7 tests)

### Agent Tests
- `src/agent/__tests__/registry.test.ts` — ToolRegistry: register, get, has, execute, argument checks, definitions, clear (9 tests)
- `src/agent/__tests__/tools.test.ts` — Original 7 tools: get_timeline, cut, trim, split, speed, volume, delete_clip (27 tests)
- `src/agent/__tests__/new-tools.test.ts` — Phase 3 tools: move_clip, duplicate_clip, add_track, fade_audio, analyze_video (24 tests)
- `src/agent/__tests__/agent.test.ts` — Agent loop with mock provider (7 tests)
- `src/agent/__tests__/video-understanding.test.ts` — Frame sampling, transcript search, indexer, LLM formatting (13 tests)
- `src/agent/__tests__/export-progress.test.ts` — FFmpeg progress parsing (5 tests)
- `src/agent/__tests__/providers.test.ts` — Provider factory + Claude/OpenAI/Gemini message formatting, tool parsing, streaming (21 tests)

### Integration Tests
- `src/test/integration/import-workflow.test.ts` — full import: media file → track → clip → duration (2 tests)
- `src/test/integration/chat-workflow.test.ts` — user message → thinking → streaming response → done (3 tests)
- `src/test/integration/undo-redo-workflow.test.ts` — edit chain → undo → redo → branch discard (3 tests)
- `src/test/integration/view-mode-workflow.test.ts` — state preservation across view switches (6 tests)
- `src/test/integration/agent-tool-workflow.test.ts` — tool → store → history chain: split+undo, multi-edit undo, duplicate+delete, cross-track move, cut range, read-only tools (6 tests)
- `src/test/integration/project-save-load-workflow.test.ts` — save → edit → load roundtrip, media metadata preservation, chat message preservation (3 tests)
- `src/test/integration/keyboard-shortcuts.test.tsx` — Delete and Cmd+D on the selected clip, undo (2 tests)

**Total: 309 tests across 34 test files**

## Rules for Agents

1. **Run `npm test` after every change.** All 309+ tests must pass. If you add features, add tests.
2. **Run `npm run build` to verify TypeScript compiles.** The build is `tsc -b && vite build`.
3. **Never modify `src/components/ui/`** — those are shadcn/ui components managed by `npx shadcn-ui add`.
4. **Store state is the source of truth.** Components read from Zustand stores. Don't duplicate state.
5. **Every agent edit must create a history Action.** Call `pushAction(type, description, snapshotBefore, snapshotAfter)`. The undo/redo system depends on this.
6. **Snapshot before mutating.** Always call `getTimelineSnapshot()` before modifying the timeline, and again after, to create the before/after pair for history.
7. **Use `@/` path alias** for all imports (e.g., `import { cn } from '@/lib/utils'`).
8. **Dark theme only.** All UI uses the CSS variables in `src/index.css`. The `dark` class is on `<html>`.
9. **Test patterns:**
   - Store tests: reset state in `beforeEach`, call actions directly, assert with `getState()`
   - Component tests: render with `@testing-library/react`, interact with `userEvent` or `fireEvent`
   - Integration tests: coordinate multiple stores, verify cross-store effects
   - Tool tests: set up timeline with `setupTimeline()` helper, call `tool.execute()`, assert ToolResult + store state
10. **Don't create files unnecessarily.** Prefer editing existing files.

## Current Status

### Phase 1: Foundation — COMPLETE
- [x] Scaffold (Electron + React + Vite + Tailwind + Zustand)
- [x] Video preview with play/pause/scrub
- [x] Chat UI with messages, input, attachments
- [x] Canvas-based timeline
- [x] History panel with undo/redo
- [x] Settings (Claude/OpenAI/Gemini)
- [x] Dual-mode layout (Simple + Editor)
- [x] 5 Zustand stores

### Phase 2: Agent Core — COMPLETE
- [x] Provider-agnostic LLM layer (Claude, OpenAI, Gemini adapters)
- [x] Agent tool system + registry (BaseTool, ToolRegistry singleton)
- [x] 7 editing tools: get_timeline, cut, trim, split, speed, volume, delete_clip
- [x] Agent core loop with streaming + multi-round tool calling
- [x] Wired chat → agent → tool execution → history

### Phase 3: Timeline + Understanding — COMPLETE
- [x] Timeline ↔ preview sync (rAF playhead animation, auto-scroll, clip selection)
- [x] FFmpeg command builder (export, trim, probe, frame extract)
- [x] Platform abstraction (Electron IPC vs browser)
- [x] Video understanding pipeline (frame sampler, transcript, indexer)
- [x] 6 new tools: move_clip, duplicate_clip, add_track, fade_audio, export, analyze_video
- [x] 53 new tests (231 total across 25 files)

### Phase 4: Polish + Export — COMPLETE
- [x] Project save/load (.popcorn JSON format, Cmd+S / Cmd+O)
- [x] Export progress tracking (real-time FFmpeg progress bar, error handling)
- [x] Keyboard shortcuts (Space, Cmd+Z/Shift+Z, Cmd+S/O/D, Delete, arrows)
- [x] ExportProgress toast component
- [x] Drag-and-drop file import (already existed from Phase 1)
- [x] 19 new tests (250 total across 27 files)

### MVP Complete
All 4 phases are implemented. The app has:
- 13 agent tools, 3 LLM providers, streaming chat
- Canvas timeline with animated playhead and clip selection
- FFmpeg integration for export, project save/load
- Full keyboard shortcuts, drag-and-drop import
- 309 tests across 34 files, clean build

## Common Pitfalls

- **happy-dom doesn't support all Canvas APIs.** The `getContext` mock in `test/setup.ts` covers what Timeline.tsx uses. If you add canvas operations, extend the mock.
- **`ResizeObserver` is mocked as a class** in test setup. Don't use `vi.fn()` for it — `new` won't work.
- **Settings store is persisted** to `localStorage` via `zustand/persist`. In tests, reset state manually in `beforeEach`.
- **Electron APIs** are optional. Components check `window.electronAPI?.method` before calling. Use `isElectron()` from `src/lib/platform.ts`.
- **Timeline renders to canvas**, not DOM. You can't query canvas content with Testing Library. Test the data flow (stores) instead.
- **Export tool is async** — it fires FFmpeg and returns immediately. Progress comes via IPC events.
- **jsdom v28 has ESM issues** — use happy-dom instead (already configured).
