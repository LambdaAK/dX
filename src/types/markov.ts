export type MarkovTransition = {
  from: string
  to: string
  p: number
}

export type MarkovChainDef = {
  states: string[]
  /** Initial distribution over states; keys are state names, values are probabilities (sum to 1). */
  initialDistribution: Record<string, number>
  transitions: MarkovTransition[]
}

export type MarkovParseResult =
  | { ok: true; chain: MarkovChainDef }
  | { ok: false; error: string }
