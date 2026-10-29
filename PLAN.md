# HLedger Guestbook — Review & Rebuild Plan

As of 2026-10-29. Companion doc (with diagram): https://claude.ai/artifact/F7xArR5WTk6kHKwtuQF4PA

## Verdict: rebuild from the ground up, salvage the assets and the domain logic

Rebuild. The two things wanted most — a new UI/UX everywhere and working AR filters — touch every file, and the AR filter feature did not exist in the old app: `main` had no face-tracking code, only 46 MB of filter PNGs and MediaPipe WASM sitting unused in `public/`, a copied LearnOpenCV Python repo, and a build script pointing at a `src/components/FaceFilter/filterData.js` that was never committed. The data layer also had to change shape: photos and videos were stored as base64 strings in Postgres `text` columns, every realtime event refetched the whole table on every client, and every hook carried two code paths (Dexie vs Supabase).

Carried over: the feature set (wall, presentation mode, photo booth with strips, video messages, reactions, speech editor, PDF/Pixum book export), the filter assets (re-exported to WebP, see `scripts/build-filters.mjs`), the PDF export logic (old `src/utils/pdfExport.js`) as a reference, and the small utility modules with tests. Everything else is replaced.

The new version is a reusable event guestbook: one Supabase project, many events by slug.

## Review findings (old `main`, commit a92d20c)

| # | Severity | Finding | Where |
| --- | --- | --- | --- |
| 1 | Blocker | Media stored as base64 in Postgres `text` columns; every `select *` pulls all of it | `supabase/messages.sql`, `guestbookPersistence.js` |
| 2 | Blocker | Realtime handler refetches the entire table on every change | `supabaseRealtime.js` |
| 3 | Blocker | AR filters not implemented | `scripts-generate-filter-pngs.mjs` |
| 4 | High | RLS allows anonymous `delete`; wall shows delete on every card | `messages.sql`, `MainWall.jsx` |
| 5 | High | Supabase URL and key committed in `.github/workflows/Supabase` | |
| 6 | High | Two storage back-ends in every hook, module-level caches | `useDatabase.js` |
| 7 | High | Service worker caches every GET including API responses | `public/sw.js` |
| 8 | High | No event concept; everything hardcoded to one event | many |
| 9 | Medium | Videos reconstructed as Blobs from base64 on every refetch; wall autoplays all | |
| 10 | Medium | Presentation renders the whole feed, no virtualisation | `PresentationWall.jsx` |
| 11 | Medium | Emoji icons, 3,800 lines of per-component CSS, runtime Google Fonts | |
| 12 | Medium | Nested timers without cancellation in the booth | `PhotoBooth.jsx` |
| 13 | Medium | `sharp` as runtime dep, 46 MB unused assets, hello-world CI | |
| 14 | Medium | No TypeScript, no lint, no `.nvmrc` | |

## Target architecture

One static TypeScript SPA, one Supabase project, every row scoped to an `event_id`, media in Storage, realtime applied per row.

Screens: Guest phone (QR) → post from own phone · Booth tablet → capture + AR filters · Big-screen wall → live feed, slideshow · Host admin → moderate, export. All four are routes of one app talking to Supabase (Postgres + RLS, Realtime row changes only, Storage for media + thumbnails, Auth for the host only).

| Layer | Choice |
| --- | --- |
| App | React 19, TypeScript strict, Vite 7, React Router 7 |
| UI | Tailwind CSS v4, Radix primitives, Lucide icons, self-hosted fonts |
| Server state | TanStack Query v5; realtime events patch the cache per row |
| Client state | Zustand (event, screen mode, camera, filter) |
| Face tracking | `@mediapipe/tasks-vision` FaceLandmarker, rendered with Three.js |
| Backend | Supabase Postgres + RLS, Storage, Realtime, Auth (magic link, host only) |
| Media | Client-side encode: photos WebP/JPEG 1600 px + 400 px thumb; video WebM/MP4 ≤ 30 s + poster; resumable upload above 6 MB |
| Offline | `vite-plugin-pwa` app shell only; `NetworkOnly` for Supabase; IndexedDB outbox for failed posts |
| Quality | ESLint + Prettier, Vitest + Testing Library, Playwright smoke, Node 22 |

Data model: see `supabase/migrations/20261029100000_init.sql` (`events`, `entries`, `reactions`, `speech`, bucket `media` at `{event_id}/{entry_id}/{original|thumb}.{ext}`).

Realtime: one channel per screen, `postgres_changes` on `entries` and `reactions` filtered by `event_id`; payloads applied to the TanStack cache directly. Media never travels through realtime.

## UI/UX direction

| Screen | Device | Key decisions |
| --- | --- | --- |
| Guest `/{slug}` | Guest's phone via QR | One step per view (name → message → media → send), native camera, optimistic post, no delete |
| Booth `/{slug}/booth` | iPad/laptop fullscreen PWA | Camera fills screen, filter carousel at bottom, 3-2-1 countdown with audio, ≥ 64 px targets, retake/keep, attract screen after 45 s idle, Wake Lock |
| Wall `/{slug}/wall` | TV, read-only | New entries slide in with highlight; ~60 visible cards then virtualised; slideshow with Ken Burns; QR always visible; cursor hidden |
| Host `/{slug}/host` | Host laptop, signed in | Create event, QR/print sheet, moderation, hide/restore, speech, export |

Rules: Tailwind tokens from `events.theme` with `classic-warm` and `modern-dark` presets; Lucide icons, never emoji for controls; self-hosted fonts; `prefers-reduced-motion`; AA contrast; designed empty/loading/error states; copy in one i18n file (`da`, `en`).

## AR filter pipeline

MediaPipe FaceLandmarker for tracking, Three.js for rendering, two filter types: **sprites** placed in 3D face space via the facial transformation matrix, and **meshes** (full-face masks) warped onto live landmarks using the annotation points (`public/filters/masks/*.json`, label → MediaPipe landmark index → UV). One canvas holds video + overlays; capture and recording use that canvas.

Tracking: `runningMode: 'VIDEO'`, `numFaces: 3`, `outputFacialTransformationMatrixes`, `outputFaceBlendshapes`, GPU delegate with CPU fallback; WASM copied from the npm package at build; `face_landmarker.task` self-hosted in `public/models`; loop on `requestVideoFrameCallback`; detect on a 640 px downscale when the camera is 1080p; One Euro smoothing on pose (minCutoff 1.0, beta 0.01); keep last pose 150 ms when a face is lost.

Rendering: `WebGLRenderer`, `VideoTexture` background mirrored on X, one `Group` per face with `matrix` from the transformation matrix, `PerspectiveCamera` (~63° vertical FOV) in centimetre space; sprite = `PlaneGeometry` with the WebP texture at a canonical anchor (`manifest.json` `anchor`/`width`); mesh = `BufferGeometry` with live landmark positions, UVs from the annotation JSON, Delaunay triangles (`delaunator`) computed once; blendshape triggers from the manifest (`jawOpen` for tongue/horn).

Capture: `canvas.toBlob('image/jpeg', 0.9)` after render; strips = four captures composed; video = `canvas.captureStream(30)` + mic track, `MediaRecorder`, ≤ 30 s.

Targets: 30 fps on a 2020 MacBook Air, 24 fps on an iPad A12 at 720p; drop to every-other-frame detection with interpolation below 20 fps.

Landmark indices: nose tip 1, chin 152, forehead 10, left eye outer 33, right eye outer 263, between brows 168, upper lip 13, tragions 234 and 454.

## Implementation phases

1. Foundation — tooling, CI, migrations, bucket. Done when a clean clone runs `npm ci && npm run check` green.
2. Data layer — typed client, TanStack hooks, per-row realtime patching, media encode + upload, outbox. No base64 anywhere.
3. Design system and shell — tokens, presets, components, routes, i18n, states.
4. Guest screen — three-step post flow, native camera, resize, video ≤ 30 s, rate limit.
5. Wall screen — live masonry, virtualisation, slideshow, QR corner.
6. Booth (no filters) — fullscreen camera, single/strip/video, countdown, attract loop, Wake Lock.
7. AR filters — everything in the AR section.
8. Host screen — magic link, events CRUD, QR print, moderation, speech.
9. Export — PDF book, Pixum, ZIP, CSV from Storage URLs.
10. Hardening — PWA, offline outbox verified, reduced-motion audit, Playwright smoke, README + event-day runbook.

## Guardrails

- One PR per phase, CI green, acceptance criteria ticked.
- TypeScript strict; Supabase types regenerated on migration changes.
- One backend; no base64 media; no full-table refetch on realtime.
- Secrets only in `.env.local` and GitHub secrets.
- No destructive migration on the shared project without asking.
- Old code is reference only; do not copy its components, CSS or hooks.
