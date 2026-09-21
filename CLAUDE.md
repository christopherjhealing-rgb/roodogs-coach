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
   out in Present mode). **Grid multiplier** (`lib/gridPlan.ts`, unit-tested):
   parses a drill's free-text `players` into a per-grid capacity, divides the
   squad by it and tiles that many copies of the diagram side by side, with a
   cone total — so a 12-kid squad runs 4 grids of a 3-player drill instead of
   queuing. Whole-squad activities ("Any", "Whole group", "two teams") never
   multiply. Shown in the drill viewer and in Present mode (where it counts
   the night's roll call if one was taken). The library is the imported **drill kit** (`lib/seedDrillsKit.ts`,
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
   counter, duplicate past session. The plan reorders by **dragging the ⠿
   handle** on each row (same pattern as the Team tab's roster: pointer
   capture plus `elementsFromPoint` against `data-did`); the handle also
   takes ArrowUp/ArrowDown, so reordering isn't pointer-only. Roll call per session
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
   Coordinates are pitch units (0–100 across, 0–`pitchHeight` down —
   140 on a default board), rendering is shared between
   the editor and list previews via `BoardCanvas.tsx`. The whiteboard uses a
   **light tactical-board aesthetic matched to the drill diagrams** (off-white
   surface with a dashed green boundary, seal-green player discs with white
   numbers, red defender discs, brass-orange triangle cones, dark-ink runs and
   brass-orange passes — see `MOVEMENT_STYLE`, `TokenGlyph`, `Pitch`). Touch-first editor:
   tap-to-place, drag-to-move, drag-to-draw, erase, undo. A selected arrow
   grows a round **grip at each end**; dragging one resizes the arrow while
   the other end stays put. For a straight arrow that just moves the
   endpoint; a curved or freehand path is rotated and scaled about the fixed
   end so its shape survives (`lib/boardGeometry.ts`, unit-tested — the
   transform is a complex division mapping the old end onto the new one).
   Tapping an arrow **while a drawing tool is active** grabs that arrow
   instead of starting a second one on top of it, but only on a close hit
   (`DRAW_MODE_GRAB_UNITS`) — the arrow's hit band is deliberately much
   fatter than that for Move/Erase, and a stroke begun near an arrow must
   still draw. The selected arrow's delete × is offset square to the line so
   it never sits under a grip. Extras: ▶ Play
   animates tokens along their arrows (nearest token to an arrow's start
   gets paired with it), ⤴ shares the board as a PNG, cones have a colour
   picker and a **shape** picker (triangle cone / flat disc / square —
   `ConeShape` on the token, drawn by `ConeMarker` in `BoardCanvas.tsx`,
   which the picker buttons reuse so they can't drift from the board),
   players a number picker, and there's a Dad token for helpers. The number
   picker is **sticky**: Auto counts up from the highest on the board, but a
   picked number stays picked until another is chosen, so the same player
   can be put down more than once — where they start and where they end up
   in a sequenced set play. **Repeats are shaded** down a six-step ramp:
   the first 7 placed is the brand's deep green, a second 7 seal green, then
   progressively lighter (with dark text once the disc is too pale for
   white) — `PLAYER_SHADES` and `playerRepeatIndex` in `BoardCanvas.tsx`.
   By default it's derived from placement order at render time and not
   stored, so deleting the first 7 promotes the second by itself; the ghost
   forecasts the shade before you tap, and the list thumbnail and
   `AnimatedBoard` shade the same way. A selected player also has a
   **Sequence** row (Auto / 1–6) that sets `seq` on the token by hand, which
   then beats the derived order — for when the placement order wasn't the
   order of the move. The number row also takes a **typed label** ("Other" — up to three
   characters, upper-cased) so a player can be "SH" or "N8"; three-letter
   labels step the font down. Players can carry a **role** — anchor
   (bright green), runner (blue), passer (orange), catcher (magenta),
   tackler (yellow), jackler (purple), been tackled (red) — `PlayerRole` on
   the token, colours in `PLAYER_ROLES`, bold primaries at the coach's
   request; a role's colour wins over the shade ramp, and the legend lists
   any role in use so the board explains itself. Red doubles as the
   opposition's disc colour; the coach chose it for "been tackled"
   knowingly. The **pen** has its own colour
   (the cone palette plus its default brass) and weight (`PEN_WIDTHS`:
   thin / medium / thick), stored per stroke as `color` / `width` on the
   movement; arrows never carry either, so their house styles stay fixed.
   Landscape layout on wide screens plus a fullscreen button. The board
   starts **portrait** everywhere except a phone or small tablet physically
   held sideways (`(orientation: landscape) and (max-width: 1023px)`), which
   starts landscape — a desktop browser is portrait by default at the
   coach's request. A **Rotate** button turns it by hand; an actual screen
   change (turning the phone, resizing the window) clears the override so
   the device takes the wheel back. Which way
   the **board** is turned is separate from which **layout** the page uses:
   the tool sidebar follows the screen's width, so rotating a board on a
   desktop keeps the sidebar rather than dropping to the stacked phone
   layout. Sizing is driven from the height in both orientations, with a
   gutter allowance that knows whether the sidebar is there (`gutterPx`) —
   otherwise a phone forced to landscape budgets for a sidebar it hasn't got
   and renders the board postage-stamp sized. Shapes turn with the pitch the
   way cones would on a real board, but lettering (player numbers, the Dad
   "D") is spun back upright via `screenDelta` — see `Upright` in
   `BoardCanvas.tsx`. The palette
   collapses into **People / Equipment / Arrows** dropdowns (each with a stable
   `aria-label`) so the whole toolbar fits a phone without sideways scrolling;
   Move, Distance and Erase stay as direct buttons. **Zoom** has four ways in:
   two-finger pinch, the +/− buttons at the canvas's top-right (top, not
   bottom — the foot of a tall board sits under the fixed nav until you
   scroll), Ctrl/⌘ + the wheel (a plain wheel is left alone so the page still
   scrolls over the board), and the `+` `-` `0` keys. All four go through one
   `zoomToWidth(w, anchor)`, which clamps to `MAX_ZOOM` and keeps the frame
   inside the board, so they can't drift apart. **Zoomed on a wide screen,
   the canvas fills the column** and the visible frame takes the element's
   shape rather than the board's (`wideFrame` / `frameAspect`, with the
   element's aspect tracked by a ResizeObserver) — otherwise a portrait
   board zoomed on a desktop was a narrow magnified column with the window
   empty either side. The stored zoom is an unclamped `{x, y, w}`; the
   frame's height and the clamping are derived at render (`clampAxis`
   centres a frame that's bigger than the board along an axis), so pinch,
   wheel, keys, buttons and the hand tool all store intent and one place
   decides what's shown. Fully zoomed out, the canvas is board-shaped again.
   Phones are unchanged — their canvas already spans the width. Once zoomed,
   **moving around** has as many routes: a plain wheel / two-finger scroll pans
   (only while zoomed — at full size it's left alone so the page scrolls),
   the arrow keys nudge by a tenth of the frame, a middle-button drag pans,
   two fingers still pan, and a ✋ **hand tool** appears in the zoom stack so
   a one-finger drag pans instead of marquee-selecting; it switches itself
   off when the zoom resets. All go through `panBy` / `panDrag` with the
   same clamp. Zoom drives the SVG `viewBox` rather than a CSS transform,
   so pointer↔pitch maths stays exact at any zoom; a "Reset zoom" button
   appears when zoomed.
   A **Size** button opens a panel holding the board's real-world
   dimensions and its icon size. Boards carry a width and a length in metres
   (`widthM` default 40, `lengthM` default 1.4 × width — which reproduces the
   original fixed 100×140 shape, so existing boards are untouched). The board
   is always `PITCH_W` units across and `pitchHeight(board)` units tall, so a
   metre is the same size in both directions and a 10 m square draws square —
   that makes a 3 m × 20 m channel possible. Width and length are edited as a
   pair: whatever the two inputs show is what gets stored, so changing one
   never silently re-derives the other. **Shortening a board never deletes
   anything** — icons past the new end just aren't drawn, and the panel says
   how many and that nothing was lost. `iconScale` (XS/S/M/L chips) shrinks or
   grows every token on the board without moving it; a smaller icon keeps the
   full-size tap target. **Hit areas depend on the tool and the zoom.** With
   Move/Erase/Draw the catchment is thumb-sized on screen (`grabHitR`: 6
   units at full size, shrinking with zoom, floored at the drawn glyph). With
   a placing tool the intent is to put something down, so an icon only
   claims a tap that lands on the icon itself (`placeHitR` = 3.6 × iconScale)
   — otherwise on a 5 m grid (cones 12.5 units apart) two 6-unit catchments
   left no gap to drop a player between. `lineHitW` shrinks with zoom the
   same way. When catchments overlap — discs touching in a column — the tap
   goes to the **nearest centre** (`nearestTokenTo`), not to whichever token
   SVG drew last; and the selected item's delete × is placed in the first of
   several candidate spots that isn't on top of another icon, so it can't
   swallow a tap meant for a neighbour. All three live on `Board` and are applied at every
   render site (editor, `BoardPreview`, `AnimatedBoard`) via the helpers in
   `BoardCanvas.tsx` — `boardWidthM` / `boardLengthM` / `pitchHeight` /
   `iconScaleOf`, unit-tested in `app/(tabs)/board/boardSize.test.ts`.
   The Distance tool draws dimension lines labelled in metres, and grid lock
   snaps at a selectable step (`GRID_STEPS_M`) derived from the width. Grid
   lock is **on by default at 2.5 m** (`DEFAULT_GRID_STEP_M`). With
   grid lock on, an arrow is straight and both ends land on the nearest grid
   point — **any** grid point (`gridPoint`), so a pass can go cone to cone
   at whatever angle the cones make. An earlier version forced the eight
   compass directions; it looked tidy and stopped exactly that.
   Those steps are a **nested ladder — 0.5 / 2.5 / 5 / 10 m, each a whole
   multiple of the one below** — so a cone snapped on one grid still sits on
   an intersection of every finer grid and changing the step never strands
   what is already down. (Coarsening can still leave a cone between lines —
   7.5 m is not on a 5 m grid — which no ladder can avoid.) The floor is
   0.5 m rather than 1 m because 2.5 m has to be in the ladder and 2.5 isn't
   a whole multiple of 1; half a metre still lands every odd width in the
   library exactly (a 3 m channel is six steps). The bigger numbers follow
   the drill library, where areas are overwhelmingly multiples of 5 and 10
   (10 m ×31, 20 m ×26, 15 m ×21, 5 m ×16). The 0.5 m grid is dense at full
   size — deliberate, it's graph paper, and it opens up as you zoom.
   The ladder's nesting is asserted in
   `app/(tabs)/board/boardSize.test.ts`, so a future edit can't quietly
   break it. In Move mode a drag
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
