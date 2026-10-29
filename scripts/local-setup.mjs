// Local dev bootstrap. Run after `npx supabase start`:
//   node scripts/local-setup.mjs
// Reads the local Supabase keys, writes .env.local, creates a host user
// (host@example.com / password123) and a `demo` event with three messages.
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const EMAIL = process.env.HOST_EMAIL ?? 'host@example.com'
const PASSWORD = process.env.HOST_PASSWORD ?? 'password123'

function supabaseEnv() {
  let out
  try {
    out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    out = execSync('npx -y supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  }
  const env = {}
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
    if (m) env[m[1]] = m[2]
  }
  if (!env.API_URL || !env.ANON_KEY || !env.SERVICE_ROLE_KEY) {
    throw new Error('Could not read local Supabase keys. Is `npx supabase start` running?')
  }
  return env
}

async function call(url, key, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  return { ok: res.ok, status: res.status, body }
}

const env = supabaseEnv()
const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = env

fs.writeFileSync('.env.local', `VITE_SUPABASE_URL=${API_URL}\nVITE_SUPABASE_ANON_KEY=${ANON_KEY}\n`)
console.log('✓ wrote .env.local')

// Host user (idempotent).
let userId
const created = await call(`${API_URL}/auth/v1/admin/users`, SERVICE_ROLE_KEY, {
  method: 'POST',
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
})
if (created.ok) {
  userId = created.body.id
} else {
  const list = await call(`${API_URL}/auth/v1/admin/users?per_page=200`, SERVICE_ROLE_KEY)
  userId = list.body?.users?.find((u) => u.email === EMAIL)?.id
  if (!userId) throw new Error(`Could not create or find ${EMAIL}: ${JSON.stringify(created.body)}`)
}
console.log(`✓ host user ${EMAIL} / ${PASSWORD}`)

// Demo event (idempotent on slug).
const rest = `${API_URL}/rest/v1`
const existing = await call(`${rest}/events?slug=eq.demo&select=id`, SERVICE_ROLE_KEY)
let eventId = existing.body?.[0]?.id
if (!eventId) {
  const ev = await call(`${rest}/events`, SERVICE_ROLE_KEY, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      slug: 'demo',
      title: 'Demo Guestbook',
      subtitle: 'A celebration',
      owner: userId,
      theme: { preset: 'classic-warm' },
      settings: { moderation: false, maxVideoSeconds: 30, allowedKinds: ['message', 'photo', 'strip', 'video'], language: 'en' },
    }),
  })
  if (!ev.ok) throw new Error(`Could not create event: ${JSON.stringify(ev.body)}`)
  eventId = ev.body[0].id
  const now = Date.now()
  const msgs = [
    ['Maria', "Congratulations! What a journey. Here's to the next chapter.", '🎉🥂'],
    ['Jonas', 'Thank you for everything you taught me. You made the team better every single day.', '🙏✨'],
    ['Anne', "Best colleague, best coffee breaks. Don't be a stranger!", '☕❤️'],
  ].map(([author_name, body, emojis], i) => ({
    event_id: eventId,
    kind: 'message',
    author_name,
    body,
    emojis,
    client_id: 'seed',
    created_at: new Date(now - (i + 1) * 60_000).toISOString(),
  }))
  const ins = await call(`${rest}/entries`, SERVICE_ROLE_KEY, { method: 'POST', body: JSON.stringify(msgs) })
  if (!ins.ok) throw new Error(`Could not seed messages: ${JSON.stringify(ins.body)}`)
}
console.log('✓ demo event ready')
console.log(`
Now run:  npm run dev
  Guest:  http://localhost:3000/demo
  Wall:   http://localhost:3000/demo/wall
  Booth:  http://localhost:3000/demo/booth
  Host:   http://localhost:3000/host   (use "Sign in with a password instead")
`)
