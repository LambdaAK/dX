import type { MarkovChainDef, MarkovParseResult, MarkovTransition } from '@/types/markov'

/**
 * Parse a Markov chain DSL.
 *
 * Section 1: States: A, B, C, ...
 * Section 2: A -> B : 0.5, B -> C : 0.3, ...
 *
 * Transitions can be comma- or newline-separated. State names are trimmed;
 * probabilities must be in [0, 1].
 */
export function parseMarkovDSL(text: string): MarkovParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: 'Definition is empty.' }
  }

  const lines = trimmed.split(/\n/)
  const states: string[] = []
  const transitions: MarkovTransition[] = []
  let seenStatesLine = false
  let transitionsStartIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const statesMatch = line.match(/^States:\s*(.*)$/i)
    if (statesMatch) {
      if (seenStatesLine) {
        return { ok: false, error: 'Duplicate "States:" line.' }
      }
      seenStatesLine = true
      const part = statesMatch[1].trim()
      if (!part) {
        return { ok: false, error: 'States list is empty after "States:".' }
      }
      const names = part.split(',').map((s) => s.trim()).filter(Boolean)
      if (names.length === 0) {
        return { ok: false, error: 'No state names found.' }
      }
      const seen = new Set<string>()
      for (const n of names) {
        if (seen.has(n)) {
          return { ok: false, error: `Duplicate state name: ${n}` }
        }
        seen.add(n)
        states.push(n)
      }
      continue
    }

    // If we haven't seen States yet and this line doesn't look like a transition, require States first
    const transitionRegex = /^\s*(\S+)\s*->\s*(\S+)\s*:\s*([\d.]+)\s*$/
    const transitionMatch = line.match(transitionRegex)
    if (transitionMatch) {
      if (!seenStatesLine) {
        return { ok: false, error: 'Define states first with "States: A, B, C, ..."' }
      }
      if (transitionsStartIndex === -1) transitionsStartIndex = i
      const from = transitionMatch[1].trim()
      const to = transitionMatch[2].trim()
      const p = parseFloat(transitionMatch[3])
      if (Number.isNaN(p) || p < 0 || p > 1) {
        return { ok: false, error: `Invalid probability "${transitionMatch[3]}" (must be 0–1).` }
      }
      transitions.push({ from, to, p })
      continue
    }

    // Line might be multiple transitions separated by commas
    const parts = line.split(',')
    let hasTransition = false
    for (const part of parts) {
      const m = part.trim().match(/^\s*(\S+)\s*->\s*(\S+)\s*:\s*([\d.]+)\s*$/)
      if (m) {
        if (!seenStatesLine) {
          return { ok: false, error: 'Define states first with "States: A, B, C, ..."' }
        }
        hasTransition = true
        const p = parseFloat(m[3])
        if (Number.isNaN(p) || p < 0 || p > 1) {
          return { ok: false, error: `Invalid probability "${m[3]}" (must be 0–1).` }
        }
        transitions.push({ from: m[1].trim(), to: m[2].trim(), p })
      }
    }
    if (!hasTransition && line.length > 0 && !line.match(/^States:/i)) {
      return { ok: false, error: `Unrecognized line: "${line.slice(0, 40)}${line.length > 40 ? '...' : ''}"` }
    }
  }

  if (!seenStatesLine) {
    return { ok: false, error: 'Missing "States: A, B, C, ..." line.' }
  }

  const stateSet = new Set(states)
  for (const t of transitions) {
    if (!stateSet.has(t.from)) {
      return { ok: false, error: `Unknown state "${t.from}" in transition.` }
    }
    if (!stateSet.has(t.to)) {
      return { ok: false, error: `Unknown state "${t.to}" in transition.` }
    }
  }

  return { ok: true, chain: { states, transitions } }
}
