# Turning on cross-device sync (about 10 minutes)

Right now the app keeps its data **on each device separately** — that's why
things you add on the computer don't show up on your phone. This adds a tiny
free cloud store so all your devices share one set of data. You don't write
any code; it's all clicking in the Vercel dashboard.

## What you'll do

Add a free Redis store to your Vercel project. Vercel wires it into the app
automatically, and sync switches itself on.

## Steps

1. Go to **vercel.com** and open your **roodogs-coach** project.
2. Click the **Storage** tab (top of the project page).
3. Click **Create Database** (or **Connect Store**) and choose
   **Upstash for Redis** from the Marketplace. It's on the **free** plan —
   pick that.
4. Give it any name (e.g. `roodogs-sync`) and create it. When it asks which
   project to connect it to, choose **roodogs-coach**.
5. That's the important bit: connecting it adds the two settings the app needs
   (`KV_REST_API_URL` and `KV_REST_API_TOKEN`) to your project automatically.
6. Go to the **Deployments** tab, open the most recent deployment's **⋯**
   menu, and click **Redeploy**. (New settings only take effect on a fresh
   deploy — same rule as always.)

Done. Open the app on your computer, add or change something, then open it on
your phone — you'll see the same data. A small badge in the top corner shows
**Saving… / Saved** so you know it's going up to the cloud.

## How to tell it's working

- Top corner shows **Saved** shortly after you change something → syncing.
- Top corner shows **This device only** → the store isn't connected yet
  (redo the steps above, and make sure you **redeployed**).
- **Offline — will sync** → no internet right now; it'll catch up when you're
  back on.

## Good to know

- **It still works with no internet.** Everything saves on the device first
  and syncs up when you're back online — you can run a whole match day on
  patchy sideline signal and it'll sort itself out after.
- **Use one device at a time and you'll never lose anything.** The app always
  grabs the latest when it opens and when you switch back to it. The only way
  to get a clash is editing the *same* thing on two devices at the *same*
  moment while offline — which, as one coach, you won't.
- **Privacy:** only first names and coaching notes are stored, and only in
  your own private store. If you'd like it locked down further, set a
  `SYNC_PASSWORD` (see `.env.example`) — for a juniors team it's optional.
- **Free tier is plenty.** This is a few kilobytes of data synced a handful of
  times a day; you won't get near any limit.
