/**
 * 1D heat equation: ∂u/∂t = α ∂²u/∂x²
 * On the unit interval [0,1] with u(0,t)=u(1,t)=0.
 * Finite differences: second derivative (u_{i+1} + u_{i-1} - 2u_i) / h², forward Euler in time.
 */

export type InitialCondition1d = 'point' | 'half' | 'bump' | 'two-humps'

export interface HeatConfig1d {
  /** Number of interior points; grid has N+2 points (including boundaries) */
  N: number
  alpha: number
  dt: number
  T: number
  initial: InitialCondition1d
}

function initialGrid1d(N: number, preset: InitialCondition1d): Float64Array {
  const u = new Float64Array(N + 2)
  const h = 1 / (N + 1)
  for (let i = 1; i <= N; i++) {
    const x = i * h
    switch (preset) {
      case 'point':
        if (Math.abs(x - 0.5) <= 0.05) u[i] = 1
        break
      case 'half':
        u[i] = x < 0.5 ? 1 : 0
        break
      case 'bump':
        u[i] = Math.exp(-80 * (x - 0.5) ** 2)
        break
      case 'two-humps':
        u[i] = Math.exp(-80 * (x - 0.3) ** 2) + Math.exp(-80 * (x - 0.7) ** 2)
        break
    }
  }
  return u
}

function step1d(u: Float64Array, N: number, alpha: number, dt: number, h: number): void {
  const d2 = (i: number) => (u[i + 1] + u[i - 1] - 2 * u[i]) / (h * h)
  const next = new Float64Array(u.length)
  next.set(u)
  for (let i = 1; i <= N; i++) {
    next[i] = u[i] + dt * alpha * d2(i)
  }
  u.set(next)
}

export interface HeatResult1d {
  /** Number of grid points (N+2) */
  nPoints: number
  /** Grid spacing */
  h: number
  steps: number
  dt: number
  snapshots: Float64Array[]
  times: number[]
}

export function solveHeatEquation1d(config: HeatConfig1d): HeatResult1d {
  const { N, alpha, dt, T, initial } = config
  const h = 1 / (N + 1)
  const maxStableDt = (h * h) / (2 * alpha)
  const safeDt = Math.min(dt, 0.95 * maxStableDt)
  const numSteps = Math.max(1, Math.floor(T / safeDt))
  const actualDt = T / numSteps

  const u = initialGrid1d(N, initial)
  const snapshots: Float64Array[] = []
  const times: number[] = []

  const maxSnapshots = 201
  const stride = Math.max(1, Math.floor(numSteps / (maxSnapshots - 1)))

  snapshots.push(new Float64Array(u))
  times.push(0)

  for (let n = 1; n <= numSteps; n++) {
    step1d(u, N, alpha, actualDt, h)
    if (n % stride === 0 || n === numSteps) {
      snapshots.push(new Float64Array(u))
      times.push(n * actualDt)
    }
  }

  return {
    nPoints: N + 2,
    h,
    steps: numSteps,
    dt: actualDt,
    snapshots,
    times,
  }
}

/** Get x coordinate for grid index i (0..nPoints-1). */
export function gridX(result: HeatResult1d, i: number): number {
  return i * result.h
}
