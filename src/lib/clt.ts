import { sampleOne, theoreticalMean } from '@/lib/lln'
import type { LLNDistribution } from '@/types/lln'

export type CLTConfig = {
  distribution: LLNDistribution
  sampleSize: number
  numTrials: number
}

export type CLTResult = {
  means: number[]
  theoreticalMean: number
  theoreticalVariance: number
}

/** Theoretical variance Var(X) of one draw. */
export function theoreticalVariance(dist: LLNDistribution): number {
  switch (dist.type) {
    case 'bernoulli':
      return dist.p * (1 - dist.p)
    case 'gaussian':
      return dist.std * dist.std
    case 'uniform': {
      const range = dist.max - dist.min
      return (range * range) / 12
    }
    case 'exponential':
      return 1 / (dist.lambda * dist.lambda)
    case 'poisson':
      return dist.lambda
    case 'beta': {
      const a = Math.max(1, Math.floor(dist.alpha))
      const b = Math.max(1, Math.floor(dist.beta))
      return (a * b) / ((a + b) ** 2 * (a + b + 1))
    }
    default:
      return 0
  }
}

/** Normal pdf at x with mean μ and variance σ². */
function normalPdf(x: number, mu: number, sigmaSq: number): number {
  const sigma = Math.sqrt(sigmaSq)
  if (sigma <= 0) return 0
  const z = (x - mu) / sigma
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z)
}

/**
 * Run CLT simulation: M trials, each trial = mean of n i.i.d. draws.
 * Returns the M sample means and theoretical μ, σ² (for one draw).
 * Sample mean has variance σ²/n.
 */
export function runCLTSimulation(
  config: CLTConfig,
  rand: () => number = Math.random
): CLTResult {
  const { distribution, sampleSize, numTrials } = config
  const means: number[] = []
  for (let m = 0; m < numTrials; m++) {
    let sum = 0
    for (let i = 0; i < sampleSize; i++) {
      sum += sampleOne(distribution, rand)
    }
    means.push(sum / sampleSize)
  }
  const mu = theoreticalMean(distribution)
  const sigmaSq = theoreticalVariance(distribution)
  return {
    means,
    theoreticalMean: mu,
    theoreticalVariance: sigmaSq,
  }
}

/**
 * Build histogram bins and normal curve for chart.
 * Returns array of { binCenter, count, normalDensity } where normalDensity
 * is scaled so the curve area matches the histogram (pdf * numTrials * binWidth).
 */
export function buildHistogramData(
  result: CLTResult,
  config: CLTConfig,
  numBins: number = 40
): { binCenter: number; count: number; normalDensity: number }[] {
  const { means, theoreticalMean, theoreticalVariance } = result
  const { sampleSize, numTrials } = config
  const meanVariance = theoreticalVariance / sampleSize
  const meanStd = Math.sqrt(meanVariance)
  const min = Math.min(...means)
  const max = Math.max(...means)
  const range = max - min || 1
  const binWidth = range / numBins
  const bins = new Array(numBins).fill(0)
  const binCenters: number[] = []
  for (let i = 0; i < numBins; i++) {
    binCenters.push(min + (i + 0.5) * binWidth)
  }
  for (const x of means) {
    let idx = Math.floor((x - min) / binWidth)
    if (idx < 0) idx = 0
    if (idx >= numBins) idx = numBins - 1
    bins[idx]++
  }
  return binCenters.map((binCenter, i) => ({
    binCenter,
    count: bins[i],
    normalDensity:
      normalPdf(binCenter, theoreticalMean, meanVariance) * numTrials * binWidth,
  }))
}
