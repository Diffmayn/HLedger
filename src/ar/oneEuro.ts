// One Euro filter (Casiez et al. 2012) for vectors. Low lag on fast moves, no jitter at rest.

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

export class OneEuroVector {
  private x: Float32Array | null = null
  private dx: Float32Array | null = null
  private lastT = 0

  constructor(
    private readonly size: number,
    public minCutoff = 1.0,
    public beta = 0.01,
    public dCutoff = 1.0,
  ) {}

  reset() {
    this.x = null
    this.dx = null
  }

  /** Filters `input` in place and returns it. `t` in milliseconds. */
  filter(input: Float32Array | number[], t: number): Float32Array {
    const n = this.size
    if (!this.x || !this.dx) {
      this.x = Float32Array.from(input)
      this.dx = new Float32Array(n)
      this.lastT = t
      return this.x
    }
    const dt = Math.max(1, t - this.lastT) / 1000
    this.lastT = t
    const aD = alpha(this.dCutoff, dt)
    for (let i = 0; i < n; i++) {
      const v = input[i] ?? 0
      const prev = this.x[i] ?? v
      const rawD = (v - prev) / dt
      const d = (this.dx[i] ?? 0) + aD * (rawD - (this.dx[i] ?? 0))
      this.dx[i] = d
      const cutoff = this.minCutoff + this.beta * Math.abs(d)
      const a = alpha(cutoff, dt)
      this.x[i] = prev + a * (v - prev)
    }
    return this.x
  }
}
