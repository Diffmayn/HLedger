# HLedger — digital event guestbook

A guestbook for anniversaries, farewells and launches: guests post messages, photos and short videos from their phones, a photo booth tablet adds AR-filtered shots, a TV shows everything live, and the host moderates and exports a keepsake book.

One deployment serves many events; each event lives at `/{slug}`.

| Screen | URL | Device |
| --- | --- | --- |
| Guest posting | `/{slug}` | Guests' phones (QR code) |
| Live wall | `/{slug}/wall` | TV or projector |
| Photo booth | `/{slug}/booth` | iPad / laptop, fullscreen |
| Host admin | `/{slug}/host`, `/host` | Host laptop, signed in |

See [PLAN.md](PLAN.md) for the review, architecture and phase plan.

## Stack

React 19 · TypeScript · Vite 7 · Tailwind v4 · TanStack Query · Zustand · Supabase (Postgres + RLS, Storage, Realtime, Auth) · MediaPipe FaceLandmarker + Three.js for the AR booth.

## Setup

```bash
nvm use            # Node 22
npm ci
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

### Supabase

Apply `supabase/migrations/*.sql` to your project (Supabase CLI: `supabase link` then `supabase db push`; or paste into the SQL editor). The migration creates the tables, RLS policies, the `media` storage bucket and the realtime publication.

Auth: enable **Email (magic link)** in Authentication → Providers and add your site URL + `/host` to the redirect allow-list. The first sign-in creates the host account; events are created from `/host`.

Optional: self-host the face model to avoid the Google CDN at runtime — download `face_landmarker.task` from the [MediaPipe models page](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker#models) into `public/models/`. The app falls back to the CDN when the file is missing.

### Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run check` | lint + typecheck + unit tests + build |
| `npm run test:e2e` | Playwright smoke tests against the preview build |
| `npm run filters:build <legacy-root>` | Re-export filter assets from the old PNG set (one-off) |

## Event day

1. Create the event in `/host`, pick a theme, open **Links** and print the guest QR.
2. TV: open `/{slug}/wall`, press `F` for fullscreen, `S` toggles the slideshow.
3. Booth: open `/{slug}/booth` in Safari/Chrome, add to home screen for fullscreen, allow camera + mic.
4. If the network drops, guest posts are queued on their phones and sent when it returns.
5. After the party: **Export** → Book PDF / ZIP / CSV.

## AR filters

`public/filters/manifest.json` lists every filter. Sprites anchor to a MediaPipe landmark with an offset in centimetres; masks warp a texture onto landmark points. Tune positions by editing the manifest — no code changes needed. See the AR section in PLAN.md for the pipeline.
