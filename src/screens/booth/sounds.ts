// Tiny synthesized sounds so the booth needs no audio assets.
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.15) {
  const c = audio()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000)
  osc.connect(g).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + ms / 1000)
}

export function playBeep(n: number) {
  tone(n <= 1 ? 1046 : 784, 120, 'sine', 0.12)
}

export function playShutter() {
  tone(220, 40, 'square', 0.08)
  setTimeout(() => tone(140, 60, 'square', 0.06), 40)
}
