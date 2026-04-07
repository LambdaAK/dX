/** Finite-window lim sup/inf: min_k max(t_{k..}) and max_k min(t_{k..}). */
export function limSupLimInfFinite(terms: number[]): { limsup: number; liminf: number } {
  const finite = terms.map((t, i) => (Number.isFinite(t) ? { t, i } : null)).filter(Boolean) as {
    t: number
    i: number
  }[]
  if (finite.length === 0) return { limsup: NaN, liminf: NaN }
  const vals = finite.map((x) => x.t)
  let limsup = Infinity
  let liminf = -Infinity
  for (let k = 0; k < vals.length; k++) {
    const tail = vals.slice(k)
    const M = Math.max(...tail)
    const m = Math.min(...tail)
    limsup = Math.min(limsup === Infinity ? M : limsup, M)
    liminf = Math.max(liminf === -Infinity ? m : liminf, m)
  }
  return { limsup, liminf }
}

/** Max pairwise gap among terms with indices >= k (0-based k in array). */
export function cauchyDiameterTail(terms: number[], startIndex: number): number {
  const tail = terms.slice(startIndex).filter(Number.isFinite)
  if (tail.length <= 1) return 0
  let maxGap = 0
  for (let i = 0; i < tail.length; i++) {
    for (let j = i + 1; j < tail.length; j++) {
      maxGap = Math.max(maxGap, Math.abs(tail[i] - tail[j]))
    }
  }
  return maxGap
}

export function geometricPartialSum(r: number, n: number): number {
  if (!Number.isFinite(n) || n < 1) return NaN
  if (Math.abs(r - 1) < 1e-14) return n
  return (1 - Math.pow(r, n)) / (1 - r)
}

export function alternatingHarmonicPartial(n: number): number {
  let s = 0
  for (let k = 1; k <= n; k++) s += (k % 2 === 1 ? 1 : -1) / k
  return s
}

export function pSeriesPartial(p: number, n: number): number {
  let s = 0
  for (let k = 1; k <= n; k++) s += 1 / Math.pow(k, p)
  return s
}

export function harmonicPartial(n: number): number {
  let s = 0
  for (let k = 1; k <= n; k++) s += 1 / k
  return s
}

/** ∫_1^R x^{-p} dx */
export function improperType1Integral(p: number, R: number): number {
  if (R <= 1 || !Number.isFinite(R)) return NaN
  if (Math.abs(p - 1) < 1e-14) return Math.log(R)
  return (Math.pow(R, 1 - p) - 1) / (1 - p)
}

/** ∫_ε^1 x^{-p} dx for ε in (0,1) */
export function improperType2Integral(p: number, eps: number): number {
  if (eps <= 0 || eps >= 1 || !Number.isFinite(eps)) return NaN
  if (Math.abs(p - 1) < 1e-14) return -Math.log(eps)
  return (1 - Math.pow(eps, 1 - p)) / (1 - p)
}

export type RiemannMethod = 'left' | 'mid' | 'right' | 'trap'

export function riemannSum(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
  method: RiemannMethod
): number {
  if (n < 1 || b <= a) return NaN
  const h = (b - a) / n
  let s = 0
  for (let i = 0; i < n; i++) {
    const x0 = a + i * h
    const x1 = x0 + h
    if (method === 'left') s += f(x0) * h
    else if (method === 'right') s += f(x1) * h
    else if (method === 'mid') s += f(x0 + h / 2) * h
    else s += 0.5 * (f(x0) + f(x1)) * h
  }
  return s
}

/** Cantor set endpoints after `steps` iterations (finite approximation). */
export function cantorIntervals(steps: number): [number, number][] {
  let intervals: [number, number][] = [[0, 1]]
  const s = Math.max(0, Math.min(8, Math.floor(steps)))
  for (let k = 0; k < s; k++) {
    const next: [number, number][] = []
    for (const [a, b] of intervals) {
      const len = (b - a) / 3
      next.push([a, a + len], [b - len, b])
    }
    intervals = next
  }
  return intervals
}

export const RA_PRESETS = {
  sequenceOscillate: (n: number) => Math.sin(Math.log(n + 1)) + 0.3 * Math.sin(n),
  negOnePow: (n: number) => (n % 2 === 0 ? 1 : -1),
  convergentMix: (n: number) => ((n % 2 === 0 ? 1 : -1) / n) + 1 / (n * n),
} as const
