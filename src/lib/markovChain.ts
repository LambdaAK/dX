import type { MarkovChainDef, MarkovParseResult, MarkovTransition } from '@/types/markov'

/**
 * Markov chain utilities. Convention: transition matrix P acts on the left;
 * distributions are column vectors, so stationary distribution π satisfies Pπ = π.
 *
 * Parse a Markov chain DSL:
 *
 * Section 1: States: A, B, C, ...
 * Section 2: Initial distribution: A : 0.5, B : 0.3, C : 0.2   (or "uniform")
 * Section 3: Transitions: A -> B : 0.5, B -> C : 0.3, ...
 *
 * Each section is led by its header. Probabilities in [0, 1]; initial distribution must sum to 1.
 */
export function parseMarkovDSL(text: string): MarkovParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: 'Definition is empty.' }
  }

  const lines = trimmed.split(/\n/)
  let states: string[] = []
  let initialDistribution: Record<string, number> = {}
  const transitions: MarkovTransition[] = []
  let section: 'states' | 'initial' | 'transitions' | null = null
  let stateLines: string[] = []
  let initialLines: string[] = []
  let transitionLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    if (/^States:\s*/i.test(trimmedLine)) {
      section = 'states'
      const part = trimmedLine.replace(/^States:\s*/i, '').trim()
      if (part) stateLines.push(part)
      continue
    }

    if (/^Initial distribution:\s*/i.test(trimmedLine)) {
      section = 'initial'
      const rest = trimmedLine.replace(/^Initial distribution:\s*/i, '').trim()
      if (rest) initialLines.push(rest)
      continue
    }

    if (/^Transitions?(\s+Probabilities?)?:\s*/i.test(trimmedLine)) {
      section = 'transitions'
      const rest = trimmedLine.replace(/^Transitions?(\s+Probabilities?)?:\s*/i, '').trim()
      if (rest) transitionLines.push(rest)
      continue
    }

    if (section === 'states') {
      stateLines.push(trimmedLine)
      continue
    }

    if (section === 'initial') {
      initialLines.push(trimmedLine)
      continue
    }

    if (section === 'transitions') {
      transitionLines.push(trimmedLine)
      continue
    }

    return { ok: false, error: 'First section must be "States: A, B, C, ...".' }
  }

  const stateText = stateLines.join(' ')
  const names = stateText.split(',').map((s) => s.trim()).filter(Boolean)
  if (names.length === 0) {
    return { ok: false, error: 'States list is empty.' }
  }
  const seenState = new Set<string>()
  for (const n of names) {
    if (seenState.has(n)) {
      return { ok: false, error: `Duplicate state name: ${n}` }
    }
    seenState.add(n)
    states.push(n)
  }

  if (states.length === 0) {
    return { ok: false, error: 'Missing "States: A, B, C, ..." section.' }
  }

  if (initialLines.length === 0) {
    return { ok: false, error: 'Missing "Initial distribution:" section.' }
  }

  const stateSet = new Set(states)
  const initialText = initialLines.join(' ').trim()
  if (initialText.toLowerCase() === 'uniform') {
    const p = 1 / states.length
    for (const s of states) {
      initialDistribution[s] = p
    }
  } else {
    const probRegex = /(\S+)\s*:\s*([\d.]+)/g
    let m: RegExpExecArray | null
    while ((m = probRegex.exec(initialText)) !== null) {
      const stateName = m[1].trim()
      const prob = parseFloat(m[2])
      if (!stateSet.has(stateName)) {
        return { ok: false, error: `Unknown state "${stateName}" in initial distribution.` }
      }
      if (Number.isNaN(prob) || prob < 0 || prob > 1) {
        return { ok: false, error: `Invalid probability "${m[2]}" in initial distribution.` }
      }
      initialDistribution[stateName] = (initialDistribution[stateName] ?? 0) + prob
    }
    for (const s of states) {
      if (!(s in initialDistribution)) initialDistribution[s] = 0
    }
    const sum = states.reduce((acc, s) => acc + initialDistribution[s], 0)
    if (Math.abs(sum - 1) > 1e-6) {
      return { ok: false, error: `Initial distribution must sum to 1 (got ${sum.toFixed(4)}).` }
    }
  }

  const transitionRegex = /^\s*(\S+)\s*->\s*(\S+)\s*:\s*([\d.]+)\s*$/
  for (const line of transitionLines) {
    const parts = line.split(',')
    for (const part of parts) {
      const m = part.trim().match(transitionRegex)
      if (m) {
        const from = m[1].trim()
        const to = m[2].trim()
        const p = parseFloat(m[3])
        if (!stateSet.has(from)) {
          return { ok: false, error: `Unknown state "${from}" in transition.` }
        }
        if (!stateSet.has(to)) {
          return { ok: false, error: `Unknown state "${to}" in transition.` }
        }
        if (Number.isNaN(p) || p < 0 || p > 1) {
          return { ok: false, error: `Invalid probability "${m[3]}" (must be 0–1).` }
        }
        transitions.push({ from, to, p })
      }
    }
  }

  if (section !== 'transitions') {
    return { ok: false, error: 'Missing "Transitions:" section.' }
  }

  // From each state, outgoing probabilities must sum to 0 (absorbing) or 1. Missing edges = 0.
  const outSum = new Map<string, number>()
  for (const s of states) outSum.set(s, 0)
  for (const t of transitions) {
    outSum.set(t.from, (outSum.get(t.from) ?? 0) + t.p)
  }
  for (const s of states) {
    const sum = outSum.get(s) ?? 0
    if (sum > 0 && Math.abs(sum - 1) > 1e-6) {
      return {
        ok: false,
        error: `From state "${s}", transition probabilities sum to ${sum.toFixed(4)} (must be 0 or 1). Missing edges are treated as 0.`,
      }
    }
  }

  return { ok: true, chain: { states, initialDistribution, transitions } }
}

/**
 * Check if the chain is irreducible (every state communicates with every other state).
 * Equivalently, the directed graph with an edge i → j when P(i,j) > 0 is strongly connected.
 */
export function isIrreducible(chain: MarkovChainDef): boolean {
  const n = chain.states.length
  if (n <= 1) return true
  const P: Record<string, Record<string, number>> = {}
  for (const from of chain.states) {
    P[from] = {}
    for (const to of chain.states) P[from][to] = 0
  }
  for (const t of chain.transitions) {
    P[t.from][t.to] = (P[t.from][t.to] ?? 0) + t.p
  }
  const successors = (s: string): string[] =>
    chain.states.filter((j) => P[s][j] > 0)
  for (const start of chain.states) {
    const visited = new Set<string>()
    const queue: string[] = [start]
    visited.add(start)
    while (queue.length > 0) {
      const u = queue.shift()!
      for (const v of successors(u)) {
        if (!visited.has(v)) {
          visited.add(v)
          queue.push(v)
        }
      }
    }
    if (visited.size !== n) return false
  }
  return true
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

/**
 * Check if the chain is aperiodic: every state has period 1.
 * The period of a state i is the gcd of { n >= 1 : P^n(i,i) > 0 }; state i is aperiodic if that gcd is 1.
 */
export function isAperiodic(chain: MarkovChainDef): boolean {
  const states = chain.states
  const n = states.length
  if (n === 0) return true
  const P: Record<string, Record<string, number>> = {}
  for (const from of states) {
    P[from] = {}
    for (const to of states) P[from][to] = 0
  }
  for (const t of chain.transitions) {
    P[t.from][t.to] = (P[t.from][t.to] ?? 0) + t.p
  }
  const mult = (
    A: Record<string, Record<string, number>>,
    B: Record<string, Record<string, number>>
  ): Record<string, Record<string, number>> => {
    const C: Record<string, Record<string, number>> = {}
    for (const i of states) {
      C[i] = {}
      for (const j of states) {
        let sum = 0
        for (const k of states) sum += A[i][k] * B[k][j]
        C[i][j] = sum
      }
    }
    return C
  }
  const returnTimes: number[][] = states.map(() => [])
  let Pn: Record<string, Record<string, number>> = { ...P }
  for (let step = 1; step <= n; step++) {
    for (let i = 0; i < states.length; i++) {
      const s = states[i]
      if (Pn[s][s] > 0) returnTimes[i].push(step)
    }
    if (step < n) Pn = mult(Pn, P)
  }
  for (let i = 0; i < states.length; i++) {
    const times = returnTimes[i]
    if (times.length === 0) return false
    let d = times[0]
    for (let j = 1; j < times.length; j++) d = gcd(d, times[j])
    if (d !== 1) return false
  }
  return true
}

/**
 * Stationary distribution π satisfying π P = π (π as row vector), Σ π = 1.
 * Returns null if the chain is not irreducible (no unique stationary distribution).
 */
export function getStationaryDistribution(chain: MarkovChainDef): Record<string, number> | null {
  if (!isIrreducible(chain)) return null
  const states = chain.states
  const n = states.length
  if (n === 0) return {}
  const P: Record<string, Record<string, number>> = {}
  for (const from of states) {
    P[from] = {}
    for (const to of states) P[from][to] = 0
  }
  for (const t of chain.transitions) {
    P[t.from][t.to] = (P[t.from][t.to] ?? 0) + t.p
  }
  // π P = π  =>  (P^T - I) π^T = 0. Replace last row by sum(π)=1.
  const M: number[][] = states.map((_, i) =>
    states.map((_, j) =>
      i === n - 1 ? 1 : P[states[j]][states[i]] - (i === j ? 1 : 0)
    )
  )
  const b: number[] = states.map((_, i) => (i === n - 1 ? 1 : 0))
  const eps = 1e-10
  for (let col = 0; col < n; col++) {
    let pivot = -1
    for (let row = col; row < n; row++) {
      if (Math.abs(M[row][col]) > eps) {
        pivot = row
        break
      }
    }
    if (pivot === -1) continue
    ;[M[col], M[pivot]] = [M[pivot], M[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    const scale = M[col][col]
    for (let j = 0; j < n; j++) M[col][j] /= scale
    b[col] /= scale
    for (let row = 0; row < n; row++) {
      if (row === col || Math.abs(M[row][col]) < eps) continue
      const f = M[row][col]
      for (let j = 0; j < n; j++) M[row][j] -= f * M[col][j]
      b[row] -= f * b[col]
    }
  }
  const pi: Record<string, number> = {}
  for (let i = 0; i < n; i++) {
    pi[states[i]] = b[i]
  }
  return pi
}

/** Total variation distance: (1/2) Σ_s |p(s) - q(s)|. */
export function totalVariationDistance(
  p: Record<string, number>,
  q: Record<string, number>,
  states: string[]
): number {
  let sum = 0
  for (const s of states) {
    sum += Math.abs((p[s] ?? 0) - (q[s] ?? 0))
  }
  return 0.5 * sum
}

export type DistributionOverTimeResult = {
  t: number[]
  distributions: Record<string, number[]>
}

/**
 * Compute P(X_t = s) for each state s and t = 0, 1, ..., maxSteps.
 * Uses initial distribution μ (column vector) and transition matrix P: distribution at time t is P^t μ.
 */
export function computeDistributionOverTime(
  chain: MarkovChainDef,
  maxSteps: number
): DistributionOverTimeResult {
  const states = chain.states
  const t = Array.from({ length: maxSteps + 1 }, (_, i) => i)
  const distributions: Record<string, number[]> = {}
  for (const s of states) {
    distributions[s] = new Array(maxSteps + 1)
  }
  const P: Record<string, Record<string, number>> = {}
  for (const from of states) {
    P[from] = {}
    for (const to of states) P[from][to] = 0
  }
  for (const tr of chain.transitions) {
    P[tr.from][tr.to] = (P[tr.from][tr.to] ?? 0) + tr.p
  }
  let mu: Record<string, number> = { ...chain.initialDistribution }
  for (let step = 0; step <= maxSteps; step++) {
    for (const s of states) {
      distributions[s][step] = mu[s] ?? 0
    }
    if (step < maxSteps) {
      const next: Record<string, number> = {}
      for (const to of states) {
        next[to] = 0
        for (const from of states) {
          next[to] += (mu[from] ?? 0) * P[from][to]
        }
      }
      mu = next
    }
  }
  return { t, distributions }
}

/** From each state, cumulative probabilities and next-state list for sampling. */
export function buildTransitionMap(chain: MarkovChainDef): Map<string, { to: string[]; cumul: number[] }> {
  const map = new Map<string, { to: string[]; cumul: number[] }>()
  const byFrom = new Map<string, { to: string; p: number }[]>()
  for (const t of chain.transitions) {
    if (!byFrom.has(t.from)) byFrom.set(t.from, [])
    byFrom.get(t.from)!.push({ to: t.to, p: t.p })
  }
  for (const state of chain.states) {
    const list = byFrom.get(state) ?? []
    const to: string[] = []
    const cumul: number[] = []
    let sum = 0
    for (const { to: next, p } of list) {
      to.push(next)
      sum += p
      cumul.push(sum)
    }
    map.set(state, { to, cumul })
  }
  return map
}

/** Sample one step: from state `from`, return next state using rand() in [0,1). */
export function sampleNextState(
  from: string,
  transitionMap: Map<string, { to: string[]; cumul: number[] }>,
  rand: () => number
): string {
  const row = transitionMap.get(from)
  if (!row || row.to.length === 0) return from
  const u = rand()
  for (let i = 0; i < row.cumul.length; i++) {
    if (u < row.cumul[i]) return row.to[i]
  }
  return row.to[row.to.length - 1]
}

/** Sample one state from a distribution (cumulative sampling). */
function sampleFromDistribution(
  dist: Record<string, number>,
  states: string[],
  rand: () => number
): string {
  const u = rand()
  let cumul = 0
  for (const s of states) {
    cumul += dist[s] ?? 0
    if (u < cumul) return s
  }
  return states[states.length - 1]
}

/** Sample one trajectory: initial state from chain.initialDistribution, then `steps` transitions. Returns states at t=0..steps. */
export function sampleTrajectory(
  chain: MarkovChainDef,
  steps: number,
  rand: () => number
): string[] {
  const transitionMap = buildTransitionMap(chain)
  const start = sampleFromDistribution(chain.initialDistribution, chain.states, rand)
  const path: string[] = [start]
  let current = start
  for (let i = 0; i < steps; i++) {
    current = sampleNextState(current, transitionMap, rand)
    path.push(current)
  }
  return path
}

export type SimulateConfig = {
  M: number
  N: number
  seed?: number
}

export type SimulateResult = {
  t: number[]
  proportions: Record<string, number[]>
}

/** Run M trajectories of length N; return time steps and proportion in each state at each t. Uses chain.initialDistribution for the starting state. */
export function runSimulation(
  chain: MarkovChainDef,
  config: SimulateConfig,
  rand: () => number = Math.random
): SimulateResult {
  const { M, N } = config
  const t = Array.from({ length: N + 1 }, (_, i) => i)
  const proportions: Record<string, number[]> = {}
  for (const s of chain.states) {
    proportions[s] = new Array(N + 1).fill(0)
  }
  for (let m = 0; m < M; m++) {
    const path = sampleTrajectory(chain, N, rand)
    for (let i = 0; i < path.length; i++) {
      proportions[path[i]][i] += 1
    }
  }
  for (const s of chain.states) {
    for (let i = 0; i <= N; i++) {
      proportions[s][i] /= M
    }
  }
  return { t, proportions }
}
