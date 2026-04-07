export type SequencePresetId =
  | 'inv-n'
  | 'alt-inv-n'
  | 'inv-n-pow'
  | 'log-over-n'
  | 'sin-over-n'
  | 'root-gap'
  | 'cos-inv-n'
  | 'geom'
  | 'rational'
  | 'rational-two'
  | 'euler'
  | 'euler-square'
  | 'shifted-alt'
  | 'neg-one-pow'
  | 'linear-n'
  | 'sin-n'
  | 'harmonic'

export type SequenceParams = {
  p: number
  r: number
}

export type PresetMeta = {
  id: SequencePresetId
  title: string
  latex: string
  description: string
  hasP: boolean
  hasR: boolean
}

export const SEQUENCE_PRESETS: PresetMeta[] = [
  {
    id: 'inv-n',
    title: '1/n',
    latex: 'a_n = \\frac{1}{n}',
    description: 'Basics: converges to 0.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'alt-inv-n',
    title: '(-1)^n / n',
    latex: 'a_n = \\frac{(-1)^n}{n}',
    description: 'Alternating; still converges to 0 (not monotone).',
    hasP: false,
    hasR: false,
  },
  {
    id: 'inv-n-pow',
    title: '1 / n^p',
    latex: 'a_n = \\frac{1}{n^{p}} \\quad (p > 0)',
    description: 'Converges to 0 for any fixed p > 0.',
    hasP: true,
    hasR: false,
  },
  {
    id: 'log-over-n',
    title: 'ln(n) / n',
    latex: 'a_n = \\frac{\\ln n}{n}',
    description: 'Still converges to 0, but much more slowly than 1/n.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'sin-over-n',
    title: 'sin(n) / n',
    latex: 'a_n = \\frac{\\sin n}{n}',
    description: 'Oscillates while the amplitude shrinks to 0.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'root-gap',
    title: 'sqrt(n+1) - sqrt(n)',
    latex: 'a_n = \\sqrt{n+1} - \\sqrt{n}',
    description: 'Positive terms that decrease to 0; useful for rationalization tricks.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'cos-inv-n',
    title: 'cos(1/n)',
    latex: 'a_n = \\cos\\!\\left(\\frac{1}{n}\\right)',
    description: 'Approaches 1 because 1/n tends to 0 and cosine is continuous.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'geom',
    title: 'r^n',
    latex: 'a_n = r^{n}',
    description: 'Converges to 0 when |r| < 1; constant 1 when r = 1; otherwise no limit in ℝ (oscillation or growth).',
    hasP: false,
    hasR: true,
  },
  {
    id: 'rational',
    title: 'n / (n + 1)',
    latex: 'a_n = \\frac{n}{n+1}',
    description: 'Converges to 1.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'rational-two',
    title: '(2n + 1) / (n + 3)',
    latex: 'a_n = \\frac{2n+1}{n+3}',
    description: 'A rational sequence whose highest-degree terms give limit 2.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'euler',
    title: '(1 + 1/n)^n',
    latex: 'a_n = \\left(1 + \\frac{1}{n}\\right)^{n}',
    description: 'Classic sequence converging to e.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'euler-square',
    title: '(1 + 1/n)^(2n)',
    latex: 'a_n = \\left(1 + \\frac{1}{n}\\right)^{2n}',
    description: 'Variant of Euler’s sequence converging to e².',
    hasP: false,
    hasR: false,
  },
  {
    id: 'shifted-alt',
    title: '1 + (-1)^n / n',
    latex: 'a_n = 1 + \\frac{(-1)^n}{n}',
    description: 'Oscillates around 1 with shrinking amplitude, so it converges to 1.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'neg-one-pow',
    title: '(-1)^n',
    latex: 'a_n = (-1)^{n}',
    description: 'Oscillates between -1 and 1; no limit.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'linear-n',
    title: 'n',
    latex: 'a_n = n',
    description: 'Unbounded; diverges in ℝ.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'sin-n',
    title: 'sin(n)',
    latex: 'a_n = \\sin(n)',
    description: 'Dense in [-1, 1] but does not converge.',
    hasP: false,
    hasR: false,
  },
  {
    id: 'harmonic',
    title: 'Harmonic H_n',
    latex: 'H_n = \\sum_{k=1}^{n} \\frac{1}{k}',
    description: 'Partial sums grow like log n; diverges (slowly).',
    hasP: false,
    hasR: false,
  },
]

function clampP(p: number): number {
  if (!Number.isFinite(p) || p <= 0) return 1
  return p
}

function evalGeom(r: number, n: number): number {
  return Math.sign(r) * Math.pow(Math.abs(r), n)
}

export function evalSequenceTerm(
  preset: SequencePresetId,
  params: SequenceParams,
  n: number
): number {
  if (n < 1 || !Number.isInteger(n)) return NaN
  const p = clampP(params.p)
  const r = Number.isFinite(params.r) ? params.r : 0.5

  switch (preset) {
    case 'inv-n':
      return 1 / n
    case 'alt-inv-n':
      return (n % 2 === 0 ? 1 : -1) / n
    case 'inv-n-pow':
      return 1 / Math.pow(n, p)
    case 'log-over-n':
      return Math.log(n) / n
    case 'sin-over-n':
      return Math.sin(n) / n
    case 'root-gap':
      return Math.sqrt(n + 1) - Math.sqrt(n)
    case 'cos-inv-n':
      return Math.cos(1 / n)
    case 'geom':
      return evalGeom(r, n)
    case 'rational':
      return n / (n + 1)
    case 'rational-two':
      return (2 * n + 1) / (n + 3)
    case 'euler':
      return Math.pow(1 + 1 / n, n)
    case 'euler-square':
      return Math.pow(1 + 1 / n, 2 * n)
    case 'shifted-alt':
      return 1 + (n % 2 === 0 ? 1 : -1) / n
    case 'neg-one-pow':
      return n % 2 === 0 ? 1 : -1
    case 'linear-n':
      return n
    case 'sin-n':
      return Math.sin(n)
    case 'harmonic': {
      let h = 0
      for (let k = 1; k <= n; k++) h += 1 / k
      return h
    }
    default:
      return NaN
  }
}

/** Finite-horizon certificate: smallest N such that |a_n - L| < ε for all n ≥ N with n ≤ nMax. */
export function findTailN(
  terms: number[],
  limit: number,
  epsilon: number
): number | null {
  if (epsilon <= 0 || terms.length === 0) return null
  const nMax = terms.length
  for (let start = 1; start <= nMax; start++) {
    let ok = true
    for (let k = start; k <= nMax; k++) {
      const v = terms[k - 1]
      if (!Number.isFinite(v) || Math.abs(v - limit) >= epsilon) {
        ok = false
        break
      }
    }
    if (ok) return start
  }
  return null
}

export function theoreticalLimit(
  preset: SequencePresetId,
  params: SequenceParams
): number | null {
  const r = Number.isFinite(params.r) ? params.r : 0.5

  switch (preset) {
    case 'inv-n':
    case 'alt-inv-n':
    case 'inv-n-pow':
    case 'log-over-n':
    case 'sin-over-n':
    case 'root-gap':
      return 0
    case 'cos-inv-n':
      return 1
    case 'geom': {
      if (Math.abs(r) < 1) return 0
      if (Math.abs(r - 1) < 1e-15) return 1
      return null
    }
    case 'rational':
      return 1
    case 'rational-two':
      return 2
    case 'euler':
      return Math.E
    case 'euler-square':
      return Math.E * Math.E
    case 'shifted-alt':
      return 1
    case 'neg-one-pow':
    case 'linear-n':
    case 'sin-n':
    case 'harmonic':
      return null
    default:
      return null
  }
}

export function buildSequenceChartData(
  preset: SequencePresetId,
  params: SequenceParams,
  nMax: number
): { n: number; a: number }[] {
  const out: { n: number; a: number }[] = []
  const cap = Math.max(1, Math.min(20000, Math.floor(nMax)))
  if (preset === 'harmonic') {
    let h = 0
    for (let n = 1; n <= cap; n++) {
      h += 1 / n
      out.push({ n, a: h })
    }
    return out
  }
  for (let n = 1; n <= cap; n++) {
    out.push({ n, a: evalSequenceTerm(preset, params, n) })
  }
  return out
}
