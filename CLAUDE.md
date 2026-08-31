# Roodogs Coach

Personal coaching companion app for an Under 9s junior rugby union team
(Wanneroo Roodogs, Western Australia). Single user (the coach), used on a phone
at training and on the sideline on game day.

## Purpose

- Plan training sessions from a reusable drill library
- Run match days: track subs, game time per player, tries and tackles
- Prove fair game time across the season (Rugby Australia junior pathway
  expects everyone plays)
- Season stats view the kids will enjoy

## Stack

- Next.js (App Router) + React, deployed on Vercel
- TypeScript, Tailwind for styling
- **No auth.** Soft team password gate (`lib/appConfig.ts`), client-side only.
- All state in localStorage via a single storage module (`lib/storage.ts`).
  Components only ever talk to its typed get/set interface.
- **Local-first cloud sync** (optional) layers on top so the coach's devices
  share one dataset — see "Cross-device sync" below. With no cloud store
  configured the app runs exactly as before, on that device only.
- PWA: manifest + icons so it can be installed to the home screen

## U9 rugby context (rules that shape the app)

- Rolling subs, everyone must get meaningful game time
- Squad size and half length are configurable per match (nothing hardcoded)
- Stats to track: tries, tackles. Keep it positive — no "missed tackle" or
  negative stats for 8-year-olds.

## Data model

See `lib/types.ts`. Core entities: Player, Drill, Session, Match, MatchEvent.
Game time per player is **computed** from sub_on/sub_off event pairs
intersected with the match's `clockPeriods` (live stretches of the game
clock), never stored — so halftime never counts toward minutes and undo is
deleting the last event(s). A player still on when the match ends is closed
out at the final whistle. The pure helpers live in `lib/gameTime.ts` and are
unit-tested in `lib/gameTime.test.ts`.

## App structure

Five bottom-nav tabs, components colocated by feature under `app/(tabs)/`:

1. **Team** — roster, add/edit/archive (soft delete via `active`), drag-handle
   reorder + reset-to-number-order, and a "Team shape" formation view. The list
   splits into **Forwards** and **Backs** sections once any player has a unit
   set (plus a "No unit set" group), falling back to one plain list before then.
   Not the app's landing page — the root (`app/page.tsx`) and PWA `start_url`
   open on **Sessions**, the weekly driver.
2. **Drills** — one consistent library, seeded on first open; text search
   (`search.ts`, shared with the session builder), tag filter, and a
   **cone-set** filter (`lib/coneSetup.ts` derives a setup label from `area`,
   overridable per drill via `setup`) so drills sharing a layout group
   together. Tapping a card edits everything — description, cues, players,
   area, cone set, and the diagram (raw spec with live preview, or link a
   coach-drawn board, which takes precedence over `diagramSpec` at every
   render site). Edits MERGE onto the stored drill so unseen fields (level,
   source) survive. The drill viewer can add the drill straight into a
   session (existing or new). The session builder groups its library by cone
   set and marks back-to-back same-setup drills "same cones ✓" (also called
   out in Present mode). The library is the imported **drill kit** (`lib/seedDrillsKit.ts`,
   110, ids `kit-*`) plus hand-drawn extras (`lib/seedDrillsExtra.ts`, ids
   `kx-*`: scrum, lineout, tap-and-go, and the coach's own — driving maul
   2v2, tackle-and-jackal 1v1, drop-and-pop in threes), all
   carrying a `diagramSpec` string rendered as an animated SVG by
   `components/drills/DrillDiagram.tsx` (themed to brand via `SpecDiagram.tsx`),
   plus extra fields (cues, players, area, level, source). The original
   board-diagram starter drills (ids `seed-*`) and their example boards
   (ids `seed-board-*`) were **retired**; `lib/ensureSeed.ts` cleans both out
   of storage and seeds the library idempotently (shared `seededDrillIds`
   tracking; it runs on the Drills, Sessions and Board tabs). Render sites
   branch on `diagramSpec` (spec diagram) vs `boardId` (a coach-linked board).
   The Board tab holds only the coach's own boards.
3. **Sessions** — session builder picking drills to ~60 min with a running
   counter, reorder, duplicate past session. Roll call per session
   (`attendeeIds`) and a fullscreen Present mode that steps through the
   session drill by drill (with linked diagrams) at training.
4. **Board** — whiteboard library for drawing drills, training games and set
   plays. Boards are tagged by kind and hold tokens (players, defenders,
   cones, hurdles, tackle bags, ball) plus movement arrows (run, pass, kick,
   tackle, jump — each with a distinct style; tackles end in a T-bar; a
   curved drag draws a curved arrow) plus a freehand **Pen** (movement type
   `draw`: a plain line, no arrowhead, never grid-locked, and excluded from the
   Play animation). A drill can link one board via
   `boardId` and shows its thumbnail on the drill card.
   Coordinates are pitch units (0–100 × 0–140), rendering is shared between
   the editor and list previews via `BoardCanvas.tsx`. The whiteboard uses a
   **light tactical-board aesthetic matched to the drill diagrams** (off-white
   surface with a dashed green boundary, seal-green player discs with white
   numbers, red defender discs, brass-orange triangle cones, dark-ink runs and
   brass-orange passes — see `MOVEMENT_STYLE`, `TokenGlyph`, `Pitch`). Touch-first editor:
   tap-to-place, drag-to-move, drag-to-draw, erase, undo. Extras: ▶ Play
   animates tokens along their arrows (nearest token to an arrow's start
   gets paired with it), ⤴ shares the board as a PNG, cones have a colour
   picker, players a number picker, and there's a Dad token for helpers.
   Landscape layout on wide screens plus a fullscreen button. The palette
   collapses into **People / Equipment / Arrows** dropdowns (each with a stable
   `aria-label`) so the whole toolbar fits a phone without sideways scrolling;
   Move, Distance and Erase stay as direct buttons. **Two-finger pinch** zooms
   and pans the pitch (implemented by driving the SVG `viewBox`, so pointer↔pitch
   maths stays exact at any zoom; a "Reset zoom" button appears when zoomed).
   Boards carry a real-world width (`widthM`, default 40 m); the Distance
   tool draws dimension lines labelled in metres, and grid lock snaps at a
   selectable 1/2/5 m step derived from that width. In Move mode a drag
   over empty pitch marquee-selects several tokens (drag any one to move
   the group). Keyboard: Delete removes the selection, Ctrl/Cmd+Z undoes,
   Escape deselects. Hovering with a mouse shows a ghost of the tool
   being placed.
5. **Match** — match list, squad + starting line-up setup, live match mode
   (two-column sub swapping, per-player try/tackle with undo toast, pause for
   halftime, needs-minutes highlight, fairness tip suggesting the next sub
   once the gap passes 4 minutes), break-time fairness summary, full-time
   summary. Line-ups (starting picker, on-field, bench) sort by jersey number.
   The bench collapses via a toggle during play to fit more on-field players.
   At full-time the coach picks post-match **awards** (Try/Attacker/Tackle/
   Player of the day, plus Player of the week) from an accordion — defined in
   `lib/awards.ts`, stored on `match.awards` (award id → player id); the legacy
   `playerOfMatchId` is kept in step with `awards.player`.

Plus `/stats` (linked from the Match tab): season totals per player
including trainings attended, positive-only milestone badges (including one
per award won, tallied from `match.awards`), and CSV export via the share
sheet.

## Cross-device sync

The coach uses the app on a computer and a phone; both need the same data.
Sync is **local-first**: every device still reads/writes localStorage
instantly, and a background layer keeps a shared cloud copy in step.

- **Store**: one JSON document `{ snapshot, rev }` in a Redis REST store,
  behind `app/api/state/route.ts`. Vercel KV / Upstash Marketplace injects
  `KV_REST_API_URL` + `KV_REST_API_TOKEN` (also accepts `UPSTASH_REDIS_REST_*`).
  With **no store configured the endpoint reports `configured:false`** and the
  app is local-only — nothing breaks. `SYNC_DEV_STORE=1` uses a process-memory
  store for local testing only (never in production). `SYNC_PASSWORD`
  optionally hardens the endpoint; unset = open (soft, matches the app gate).
- **Snapshot** = the synced collections (players, drills, sessions, matches,
  matchEvents, boards, formation, and the two seed-tracking sets), each tagged
  with a "last changed" time. `storage.ts` stamps that time and fires a
  `roodogs:write` event on every real change (no-op writes are skipped).
- **Merge** (`lib/sync.ts`, unit-tested in `sync.test.ts`): per-collection
  last-write-wins. The right grain for one coach on two devices — editing the
  roster on the phone can't clobber a boards edit made earlier on the computer,
  and deletions within a collection propagate. Pure and framework-free.
- **Lifecycle** (`components/SyncProvider.tsx`, under the password gate):
  pulls on boot (behind a brief "Syncing…" splash, time-boxed so a dead
  network never hangs), pushes debounced on change with an optimistic `rev`
  check (conflict → merge server state and retry), and re-pulls on tab focus.
  A pulled change bumps `useDataVersion()`, which the list pages depend on so
  they re-read live. Detail editors (board `[id]`, match `[id]`) deliberately
  don't auto-refresh mid-edit. A small corner badge shows Saving/Saved/Offline/
  This device only.

## Conventions

- All dates ISO strings, all times epoch ms
- Australian English in UI copy ("centre", "organise")
- Kids' privacy: first names only in UI examples; no analytics, no external
  calls with player data
- Big tap targets (min 44–48px) — this is used with cold hands in winter

## Commands

- `npm run dev` — local dev
- `npm run build` — production build (must pass before commit)
- `npm test` — game-time engine unit tests (must pass before commit)
