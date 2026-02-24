/**
 * 2D heat equation: ∂u/∂t = α ∇²u
 * Solved on a unit square [0,1]×[0,1] with finite differences:
 * - 5-point Laplacian: (u_{i+1,j} + u_{i-1,j} + u_{i,j+1} + u_{i,j-1} - 4u_{i,j}) / h²
 * - Forward Euler in time.
 * Boundary conditions: Dirichlet, u = 0 on all boundaries.
 */

export type InitialCondition = 'point' | 'half' | 'corner' | 'two-spots'

export interface HeatConfig {
  /** Grid resolution (N×N interior points; total grid (N+2)×(N+2) including boundary) */
  N: number
  /** Diffusivity α */
  alpha: number
  /** Time step */
  dt: number
  /** Total simulation time */
  T: number
  /** Initial condition preset */
  initial: InitialCondition
}

/**
 * Create initial condition on grid of size (N+2)×(N+2) (including ghost/boundary).
 * Interior indices 1..N; boundary at 0 and N+1 set to 0.
 */
function initialGrid(N: number, preset: InitialCondition): Float64Array {
  const size = (N + 2) * (N + 2)
  const u = new Float64Array(size)
  const idx = (i: number, j: number) => i * (N + 2) + j

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const x = (j - 0.5) / N
      const y = (i - 0.5) / N
      switch (preset) {
        case 'point':
          if (Math.abs(x - 0.5) <= 0.08 && Math.abs(y - 0.5) <= 0.08) {
            u[idx(i, j)] = 1
          }
          break
        case 'half':
          u[idx(i, j)] = x < 0.5 ? 1 : 0
          break
        case 'corner':
          if (x < 0.3 && y < 0.3) u[idx(i, j)] = 1
          break
        case 'two-spots':
          if (
            (x - 0.25) ** 2 + (y - 0.5) ** 2 < 0.04 ||
            (x - 0.75) ** 2 + (y - 0.5) ** 2 < 0.04
          ) {
            u[idx(i, j)] = 1
          }
          break
      }
    }
  }
  return u
}

/**
 * One forward-Euler step. Grid layout: (N+2)×(N+2), boundary u=0.
 */
function step(u: Float64Array, N: number, alpha: number, dt: number, h: number): void {
  const idx = (i: number, j: number) => i * (N + 2) + j
  const laplacian = (i: number, j: number) =>
    (u[idx(i + 1, j)] + u[idx(i - 1, j)] + u[idx(i, j + 1)] + u[idx(i, j - 1)] - 4 * u[idx(i, j)]) / (h * h)

  const next = new Float64Array(u.length)
  next.set(u)

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      next[idx(i, j)] = u[idx(i, j)] + dt * alpha * laplacian(i, j)
    }
  }

  u.set(next)
}

/**
 * Run the heat equation and return snapshots at evenly spaced times (including t=0).
 * Number of snapshots is capped for memory; we sample every `stride` steps.
 */
export interface HeatResult {
  /** Grid size (N+2) per side */
  gridSize: number
  /** Number of time steps taken */
  steps: number
  /** Time between steps */
  dt: number
  /** Snapshots: array of grid state at each sampled time */
  snapshots: Float64Array[]
  /** Times for each snapshot */
  times: number[]
}

export function solveHeatEquation(config: HeatConfig): HeatResult {
  const { N, alpha, dt, T, initial } = config
  const h = 1 / (N + 1)
  const maxStableDt = (h * h) / (4 * alpha)
  const safeDt = Math.min(dt, 0.95 * maxStableDt)
  const numSteps = Math.max(1, Math.floor(T / safeDt))
  const actualDt = T / numSteps

  const u = initialGrid(N, initial)
  const snapshots: Float64Array[] = []
  const times: number[] = []

  const maxSnapshots = 201
  const stride = Math.max(1, Math.floor(numSteps / (maxSnapshots - 1)))

  snapshots.push(new Float64Array(u))
  times.push(0)

  for (let n = 1; n <= numSteps; n++) {
    step(u, N, alpha, actualDt, h)
    if (n % stride === 0 || n === numSteps) {
      snapshots.push(new Float64Array(u))
      times.push(n * actualDt)
    }
  }

  return {
    gridSize: N + 2,
    steps: numSteps,
    dt: actualDt,
    snapshots,
    times,
  }
}

/**
 * Get value at interior cell (i, j) from flat grid; i, j in 0..gridSize-1.
 */
export function getCell(result: HeatResult, snapshotIndex: number, i: number, j: number): number {
  const gridSize = result.gridSize
  if (snapshotIndex < 0 || snapshotIndex >= result.snapshots.length) return 0
  if (i < 0 || i >= gridSize || j < 0 || j >= gridSize) return 0
  return result.snapshots[snapshotIndex][i * gridSize + j]
}
