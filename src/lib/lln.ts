import { normal } from '@/lib/random'
import type { LLNDistribution, LLNConfig, LLNResult } from '@/types/lln'

/** Sample one value from the distribution. */
export function sampleOne(
  dist: LLNDistribution,
  rand: () => number
): number {
  switch (dist.type) {
    case 'bernoulli':
      return rand() < dist.p ? 1 : 0
    case 'gaussian':
      return dist.mean + dist.std * normal(rand)
    case 'uniform':
      return dist.min + (dist.max - dist.min) * rand()
    default:
      return 0
  }
}

/** Theoretical mean E[X]. */
export function theoreticalMean(dist: LLNDistribution): number {
  switch (dist.type) {
    case 'bernoulli':
      return dist.p
    case 'gaussian':
      return dist.mean
    case 'uniform':
      return (dist.min + dist.max) / 2
    default:
      return 0
  }
}

/** Run one sequence of n samples and return running mean at each step. */
export function runLLNSimulation(
  config: LLNConfig,
  rand: () => number = Math.random
): LLNResult {
  const { distribution, numSamples } = config
  const n: number[] = []
  const runningMean: number[] = []
  let sum = 0
  for (let i = 1; i <= numSamples; i++) {
    sum += sampleOne(distribution, rand)
    n.push(i)
    runningMean.push(sum / i)
  }
  return {
    n,
    runningMean,
    theoreticalMean: theoreticalMean(distribution),
  }
}
