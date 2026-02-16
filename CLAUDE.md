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

**Always run `npm test` after making changes.** All 142 tests must pass before committing.

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
│   │   ├── timeline/      # Timeline (canvas-based)
│   │   ├── history/       # HistoryPanel (undo/redo actions)
│   │   ├── settings/      # Settings modal (API keys, provider select)
│   │   └── ui/            # shadcn/ui primitives (button, input, etc.)
│   ├── stores/            # Zustand state management
│   │   ├── project.ts     # Media files, tracks, clips, timeline
│   │   ├── ui.ts          # View mode, playhead, zoom, selection
│   │   ├── settings.ts    # API keys, active provider (persisted)
│   │   ├── chat.ts        # Messages, attachments, agent thinking
│   │   └── history.ts     # Action stack (undo/redo via snapshots)
│   ├── agent/             # (Phase 2) LLM providers + tool system
│   │   ├── providers/     # claude.ts, openai.ts, gemini.ts
│   │   ├── tools/         # cut.ts, split.ts, trim.ts, etc.
│   │   └── video-understanding/
│   ├── lib/
│   │   ├── types.ts       # All TypeScript interfaces
│   │   ├── time.ts        # formatTime, formatTimecode, parseTimecode
│   │   └── utils.ts       # cn() helper
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
- `Clip` — segment on a track (references a MediaFile, has startInTimeline, duration, speed, volume)
- `Action` — undo/redo entry with snapshotBefore and snapshotAfter
- `AgentMessage` — chat message with optional FrameAttachments
- `Settings` — provider configs (apiKey + model per provider)

### Stores

| Store | Key Concepts |
|-------|-------------|
| `project` | addMediaFile, addTrack/addClip/removeClip/updateClip, getTimelineSnapshot/restoreTimeline |
| `ui` | viewMode (simple/editor), playhead, isPlaying, duration, timelineZoom, settingsOpen |
| `settings` | providers map, activeProvider, getActiveConfig(). Persisted via zustand/persist |
| `chat` | messages array, addMessage/appendToMessage (streaming), pendingAttachments |
| `history` | actions array + currentIndex. pushAction discards future on new branch. undo/redo restore snapshots |

### Dual Layout

- **SimpleView** — video preview (top) + chat (bottom). Default mode.
- **EditorView** — preview + history (left), chat (right), timeline (bottom strip)
- Toggle via Header button or `useUIStore.setViewMode()`

## Test Structure

**Framework:** Vitest + @testing-library/react + happy-dom

Tests are co-located with source in `__tests__/` directories:

### Unit Tests (lib + stores)
- `src/lib/__tests__/time.test.ts` — formatTime, formatTimecode, parseTimecode edge cases
- `src/lib/__tests__/utils.test.ts` — cn() Tailwind merge behavior
- `src/stores/__tests__/project.test.ts` — CRUD for media files, tracks, clips, snapshot/restore
- `src/stores/__tests__/ui.test.ts` — view mode, playhead, zoom, selection
- `src/stores/__tests__/settings.test.ts` — provider config, active provider, persistence
- `src/stores/__tests__/chat.test.ts` — messages, streaming, attachments
- `src/stores/__tests__/history.test.ts` — push/undo/redo/revertTo, branch discard

### UI Component Tests
- `src/components/__tests__/Controls.test.tsx` — play/pause toggle, skip ±5s, time display
- `src/components/__tests__/MessageList.test.tsx` — empty state, messages, attachments, thinking indicator
- `src/components/__tests__/MessageInput.test.tsx` — send button state, Enter key, attachment display
- `src/components/__tests__/HistoryPanel.test.tsx` — empty state, action list, undo/redo buttons, revert click
- `src/components/__tests__/Settings.test.tsx` — open/close, provider cards, API key input, active switch
- `src/components/__tests__/Header.test.tsx` — app name, import button, view toggle, settings open
- `src/components/__tests__/Layout.test.tsx` — SimpleView and EditorView render all expected sections

### Integration Tests
- `src/test/integration/import-workflow.test.ts` — full import: media file → track → clip → duration
- `src/test/integration/chat-workflow.test.ts` — user message → thinking → streaming response → done
- `src/test/integration/undo-redo-workflow.test.ts` — edit chain → undo → redo → branch discard
- `src/test/integration/view-mode-workflow.test.ts` — state preservation across view switches

## Rules for Agents

1. **Run `npm test` after every change.** All 142+ tests must pass. If you add features, add tests.
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
- [x] Test suite (142 tests)

### Phase 2: Agent Core — NEXT
- [ ] Provider-agnostic LLM layer (`src/agent/providers/`)
- [ ] Agent tool system + registry (`src/agent/tools/`)
- [ ] First tools: get_timeline, analyze_video, cut, trim, split
- [ ] Wire chat → agent → tool execution → history
- [ ] Streaming responses in chat

### Phase 3: Timeline + Understanding
- [ ] FFmpeg integration (execute real cuts/trims)
- [ ] Video understanding pipeline (frame extraction + transcript)
- [ ] Frame selector (click preview → attach to chat)
- [ ] Remaining tools: speed, volume, fade_audio, move_clip, export
- [ ] Timeline ↔ preview sync

### Phase 4: Polish + Export
- [ ] Export pipeline
- [ ] Project save/load
- [ ] Progress indicators
- [ ] Browser compatibility (ffmpeg.wasm)

## Common Pitfalls

- **happy-dom doesn't support all Canvas APIs.** The `getContext` mock in `test/setup.ts` covers what Timeline.tsx uses. If you add canvas operations, extend the mock.
- **`ResizeObserver` is mocked as a class** in test setup. Don't use `vi.fn()` for it — `new` won't work.
- **Settings store is persisted** to `localStorage` via `zustand/persist`. In tests, reset state manually in `beforeEach`.
- **Electron APIs** are optional. Components check `window.electronAPI?.method` before calling. Browser mode uses file input fallback.
- **Timeline renders to canvas**, not DOM. You can't query canvas content with Testing Library. Test the data flow (stores) instead.
