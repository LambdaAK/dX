export type MarkovTransition = {
  from: string
  to: string
  p: number
}

export type MarkovChainDef = {
  states: string[]
  transitions: MarkovTransition[]
}

export type MarkovParseResult =
  | { ok: true; chain: MarkovChainDef }
  | { ok: false; error: string }
