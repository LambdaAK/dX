import type { ProcessDef } from '@/types/process'

/**
 * Fokker-Planck (forward Kolmogorov) equation for dX = f(X,t)dt + g(X,t)dW:
 *   ∂p/∂t = -∂/∂x[f·p] + (1/2)∂²/∂x²[g²·p]
 * Solved with finite differences: central for space, explicit Euler for time.
 */

export type FokkerPlanckOptions = {
  process: ProcessDef
  params: Record<string, number>
  x0: number
  t0: number
  T: number
  xMin: number
  xMax: number
  nX: number
  /** Max time steps (solver may use fewer for stability). If not set, we pick dt from CFL. */
  maxNt?: number
}

export type FokkerPlanckResult = {
  x: number[]
  t: number[]
  /** p[timeIndex][spaceIndex] = density at (x[spaceIndex], t[timeIndex]) */
  p: number[][]
}

function gaussian(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))
}

/**
 * Solve the Fokker-Planck PDE for p(x,t) with initial condition p(x,t0) ≈ δ(x-x0).
 * Returns p[time][space] and the x/t grids. Time step is chosen for stability (CFL).
 */
export function solveFokkerPlanck(options: FokkerPlanckOptions): FokkerPlanckResult {
  const { process, params, x0, t0, T, xMin, xMax, nX, maxNt = 500 } = options
  const dx = (xMax - xMin) / (nX - 1)

  const x: number[] = new Array(nX)
  for (let i = 0; i < nX; i++) x[i] = xMin + i * dx

  // Stability: diffusion CFL dt <= dx²/(2 max g²); advection CFL dt <= dx/max|f|.
  let maxG2 = 1e-10
  let maxAbsF = 1e-10
  for (let i = 0; i < nX; i++) {
    const g = process.diffusion(x[i], t0, params)
    const g2 = g * g
    if (g2 > maxG2) maxG2 = g2
    const f = process.drift(x[i], t0, params)
    const absF = Math.abs(f)
    if (absF > maxAbsF) maxAbsF = absF
  }
  const dtDiff = (0.35 * dx * dx) / maxG2
  const dtAdv = maxAbsF > 1e-10 ? (0.5 * dx) / maxAbsF : Infinity
  const dtStable = Math.min(dtDiff, dtAdv)
  const nT = Math.min(maxNt, Math.max(10, Math.ceil((T - t0) / dtStable)))
  const dt = (T - t0) / nT

  const t: number[] = new Array(nT + 1)
  for (let n = 0; n <= nT; n++) t[n] = t0 + n * dt

  // Initial condition: Gaussian centered at x0; wide enough to avoid grid-scale ringing
  const eps = Math.max(dx * 6, 1e-6 * (xMax - xMin))
  let sum = 0
  const p0: number[] = new Array(nX)
  for (let i = 0; i < nX; i++) {
    p0[i] = gaussian(x[i], x0, eps)
    sum += p0[i] * dx
  }
  for (let i = 0; i < nX; i++) p0[i] /= sum

  const p: number[][] = [p0]
  const pNext: number[] = new Array(nX)

  // Stability: need dt <= dx² / (2 * max(g²)) for diffusion. If dt too large, we'd need smaller dt or implicit scheme.
  // Clip diffusion coefficient to avoid zeros (e.g. GBM at x=0)
  const g2Min = 1e-10
  for (let n = 0; n < nT; n++) {
    const pn = p[p.length - 1]
    const tn = t[n]
    for (let i = 1; i < nX - 1; i++) {
      const xi = x[i]
      const fi = process.drift(xi, tn, params)
      const g = process.diffusion(xi, tn, params)
      const g2 = Math.max(g * g, g2Min)
      const fp_i = fi * pn[i]
      const fp_prev = process.drift(x[i - 1], tn, params) * pn[i - 1]
      const fp_next = process.drift(x[i + 1], tn, params) * pn[i + 1]
      // Upwind advection -∂/∂x[f·p] to avoid oscillations (central difference causes dispersion)
      const advection =
        fi > 0 ? -(fp_i - fp_prev) / dx : -(fp_next - fp_i) / dx
      const g2p_i = g2 * pn[i]
      const g2p_prev = Math.max(process.diffusion(x[i - 1], tn, params) ** 2, g2Min) * pn[i - 1]
      const g2p_next = Math.max(process.diffusion(x[i + 1], tn, params) ** 2, g2Min) * pn[i + 1]
      const diffusion = 0.5 * (g2p_next - 2 * g2p_i + g2p_prev) / (dx * dx)
      pNext[i] = pn[i] + dt * (advection + diffusion)
      if (pNext[i] < 0) pNext[i] = 0
    }
    pNext[0] = 0
    pNext[nX - 1] = 0
    // Renormalize to avoid drift
    let total = 0
    for (let i = 0; i < nX; i++) total += pNext[i] * dx
    if (total > 0) {
      for (let i = 0; i < nX; i++) pNext[i] /= total
    }
    p.push([...pNext])
  }

  return { x, t, p }
}

/**
 * Suggest a reasonable spatial domain [xMin, xMax] for the process (e.g. from OU theory).
 */
export function suggestDomain(
  processId: string,
  params: Record<string, number>,
  x0: number,
  T: number
): { xMin: number; xMax: number } {
  switch (processId) {
    case 'brownian': {
      const half = 3 * Math.sqrt(T + 1)
      return { xMin: x0 - half, xMax: x0 + half }
    }
    case 'ornstein-uhlenbeck': {
      const theta = params.theta ?? 1
      const mu = params.mu ?? 0
      const sigma = params.sigma ?? 1
      const std = sigma / Math.sqrt(2 * theta)
      const half = 4 * std
      return { xMin: mu - half, xMax: mu + half }
    }
    case 'geometric-brownian': {
      const mu = params.mu ?? 0.1
      const sigma = params.sigma ?? 0.2
      const mean = x0 * Math.exp(mu * T)
      const spread = mean * (Math.exp(sigma * sigma * T) - 1) ** 0.5 * 2
      return { xMin: Math.max(1e-6, x0 * 0.01), xMax: mean + spread }
    }
    default: {
      const half = 5
      return { xMin: x0 - half, xMax: x0 + half }
    }
  }
}
