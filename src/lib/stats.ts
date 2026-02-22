import type { Path, Stats } from '@/types/simulation'

/**
 * Compute mean, variance, std per time point across paths.
 * Assumes all paths share the same t[] (same config).
 */
export function computeStats(paths: Path[]): Stats {
  if (paths.length === 0) {
    return { t: [], mean: [], variance: [], std: [] }
  }

  const nT = paths[0].t.length
  const t = paths[0].t
  const mean: number[] = new Array(nT)
  const variance: number[] = new Array(nT)
  const std: number[] = new Array(nT)
  const M = paths.length

  for (let j = 0; j < nT; j++) {
    let sum = 0
    for (let m = 0; m < M; m++) sum += paths[m].x[j]
    mean[j] = sum / M

    let sumSq = 0
    for (let m = 0; m < M; m++) {
      const d = paths[m].x[j] - mean[j]
      sumSq += d * d
    }
    variance[j] = M > 1 ? sumSq / (M - 1) : 0
    std[j] = Math.sqrt(variance[j])
  }

  return { t, mean, variance, std }
}

/**
 * Quantiles per time point (e.g. [0.05, 0.25, 0.5, 0.75, 0.95]).
 */
export function computeQuantiles(
  paths: Path[],
  percentiles: number[]
): { p: number; values: number[] }[] {
  if (paths.length === 0) return []
  const nT = paths[0].t.length
  const result: { p: number; values: number[] }[] = percentiles.map((p) => ({
    p,
    values: new Array(nT),
  }))

  const sorted = new Float64Array(paths.length)
  for (let j = 0; j < nT; j++) {
    for (let m = 0; m < paths.length; m++) sorted[m] = paths[m].x[j]
    sorted.sort()
    percentiles.forEach((p, i) => {
      const idx = Math.min(
        paths.length - 1,
        Math.max(0, Math.round(p * (paths.length - 1)))
      )
      result[i].values[j] = sorted[idx]
    })
  }
  return result
}
