# Roodogs Coach 🏉

Coaching companion for the Wanneroo Roodogs Under 9s — plan training, run
match days one-handed from the sideline, and prove everyone's getting a fair
run.

- **Team** — roster with add, edit and archive
- **Drills** — 25 seeded U9 drills, filterable by tag, fully editable
- **Sessions** — build a ~60 minute plan from the library, duplicate past
  sessions
- **Board** — digital whiteboard: drag-and-drop players, defenders, cones,
  hurdles and tackle bags, draw runs, passes, kicks, tackles and jumps —
  for drills, training games and set plays
- **Match** — live mode: tap-to-swap subs, per-player game time, try and
  tackle buttons with undo, pause for halftime
- **Season stats** — minutes, games, tries and tackles per player

Everything is stored on the device (localStorage) and installable to the home
screen as a PWA. Turn on **cross-device sync** (a free Vercel store, ~10 min,
no code) to share one dataset between your computer and phone — see
[docs/SYNC-SETUP.md](docs/SYNC-SETUP.md). Without it, the app runs local-only
on each device, exactly as before.

## Running it

```bash
npm install
npm run dev    # local dev
npm run build  # production build
npm test       # game-time engine tests
```

## Deploying on Vercel

Import the repository into Vercel (Add New → Project), accept the Next.js
defaults, and deploy. No environment variables needed. Every push to `main`
deploys automatically.
