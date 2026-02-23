export type LLNDistribution =
  | { type: 'bernoulli'; p: number }
  | { type: 'gaussian'; mean: number; std: number }
  | { type: 'uniform'; min: number; max: number }

export type LLNConfig = {
  distribution: LLNDistribution
  numSamples: number
}

export type LLNResult = {
  n: number[]
  runningMean: number[]
  theoreticalMean: number
}
