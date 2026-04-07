import { useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  RA_PRESETS,
  alternatingHarmonicPartial,
  cantorIntervals,
  cauchyDiameterTail,
  geometricPartialSum,
  harmonicPartial,
  improperType1Integral,
  improperType2Integral,
  limSupLimInfFinite,
  pSeriesPartial,
  riemannSum,
  type RiemannMethod,
} from '@/lib/realAnalysisMath'
import mc from '../MarkovChainSection.module.css'
import hub from './RealAnalysisSection.module.css'

function tex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

function sampleFunction(
  f: (x: number) => number,
  a: number,
  b: number,
  points: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  if (b <= a || points < 2) return out
  for (let i = 0; i < points; i++) {
    const x = a + ((b - a) * i) / (points - 1)
    const y = f(x)
    if (Number.isFinite(y)) out.push({ x, y })
  }
  return out
}

/** Check |f(x)-L|<ε on a δ-neighborhood of a (uniform grid on closed interval). */
function epsilonDeltaHolds(
  f: (x: number) => number,
  a: number,
  L: number,
  delta: number,
  epsilon: number,
  samples = 120
): boolean {
  if (delta <= 0 || epsilon <= 0) return false
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1)
    const x = a - delta + t * 2 * delta
    const y = f(x)
    if (!Number.isFinite(y) || Math.abs(y - L) >= epsilon) return false
  }
  return true
}

export function SeriesPanel() {
  const [kind, setKind] = useState<'geom' | 'alt' | 'p' | 'harm'>('geom')
  const [r, setR] = useState(0.6)
  const [p, setP] = useState(2)
  const [nMax, setNMax] = useState(80)

  const data = useMemo(() => {
    const out: { n: number; S: number; integral?: number }[] = []
    for (let n = 1; n <= nMax; n++) {
      let S = 0
      if (kind === 'geom') S = geometricPartialSum(r, n)
      else if (kind === 'alt') S = alternatingHarmonicPartial(n)
      else if (kind === 'p') S = pSeriesPartial(p, n)
      else S = harmonicPartial(n)

      let integral: number | undefined
      if (kind === 'p' && p > 0 && Math.abs(p - 1) > 1e-9) {
        integral = (1 - Math.pow(n + 1, 1 - p)) / (1 - p)
      } else if (kind === 'p' && Math.abs(p - 1) < 1e-9) {
        integral = harmonicPartial(n)
      }

      out.push({ n, S, integral })
    }
    return out
  }, [kind, r, p, nMax])

  const limitHint =
    kind === 'geom'
      ? Math.abs(r) < 1
        ? `Partial sums approach ${(1 / (1 - r)).toFixed(6)} (geometric series).`
        : Math.abs(r) >= 1
          ? '|r| ≥ 1: partial sums need not converge (|r|>1 grows; r=±1 oscillates or adds constants).'
          : ''
      : kind === 'alt'
        ? 'Converges to ln 2 ≈ 0.693147 (alternating series test).'
        : kind === 'p'
          ? p > 1
            ? `Converges (p-series); ζ(p) ≈ partial sum as n grows.`
            : p <= 1
              ? 'Diverges: terms do not decay fast enough (compare harmonic).'
              : ''
          : 'Harmonic series diverges (partial sums ~ ln n + γ).'

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Series</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\sum_{k=1}^\\infty a_k') }} /> converge when partial sums{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('S_n = \\sum_{k=1}^n a_k') }} /> tend to a finite limit. Explore classical
          families and compare a <strong>p-series</strong> tail with an <strong>integral</strong> stencil (integral test idea).
        </p>
      </div>
      <div className={mc.editorBlock}>
        <h3 className={mc.optionsTitle}>Preset</h3>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>Series</span>
            <select className={mc.select} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="geom">Geometric ∑ rᵏ</option>
              <option value="alt">Alternating harmonic ∑ (-1)ᵏ⁺¹/k</option>
              <option value="p">p-series ∑ 1/kᵖ</option>
              <option value="harm">Harmonic ∑ 1/k</option>
            </select>
          </label>
          {kind === 'geom' && (
            <label className={mc.fieldLabel}>
              <span>r</span>
              <input
                type="number"
                className={mc.input}
                step={0.05}
                value={r}
                onChange={(e) => setR(Number(e.target.value))}
              />
            </label>
          )}
          {kind === 'p' && (
            <label className={mc.fieldLabel}>
              <span>p</span>
              <input
                type="number"
                className={mc.input}
                min={0.25}
                max={4}
                step={0.05}
                value={p}
                onChange={(e) => setP(Number(e.target.value) || 1)}
              />
            </label>
          )}
          <label className={mc.fieldLabel}>
            <span>n max</span>
            <input
              type="number"
              className={mc.input}
              min={10}
              max={2000}
              step={10}
              value={nMax}
              onChange={(e) => setNMax(Math.max(2, Math.floor(Number(e.target.value) || 80)))}
            />
          </label>
        </div>
        <p className={mc.hint}>{limitHint}</p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Partial sums Sₙ</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="n" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" width={48} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              />
              <Line type="monotone" dataKey="S" stroke="var(--accent)" dot={false} strokeWidth={2} name="Sₙ" isAnimationActive={false} />
              {kind === 'p' && data.some((d) => d.integral !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="integral"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  name="∫₁ⁿ⁺¹ x⁻ᵖ dx"
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {kind === 'p' && (
          <p className={mc.hint}>
            Blue dashed curve is <span dangerouslySetInnerHTML={{ __html: tex(`\\int_1^{n+1} x^{-p}\\,dx`) }} />, a continuous
            lower/upper companion used in the integral test (sign depends on p and monotonicity).
          </p>
        )}
      </div>
    </div>
  )
}

export function SubsequenceLimPanel() {
  const [preset, setPreset] = useState<'osc' | 'neg' | 'mix'>('osc')
  const [nMax, setNMax] = useState(200)

  const seq = preset === 'osc' ? RA_PRESETS.sequenceOscillate : preset === 'neg' ? RA_PRESETS.negOnePow : RA_PRESETS.convergentMix

  const { chartData, stats } = useMemo(() => {
    const terms: number[] = []
    const chartData: { n: number; a: number; even: number | null; odd: number | null }[] = []
    for (let n = 1; n <= nMax; n++) {
      const a = seq(n)
      terms.push(a)
      chartData.push({
        n,
        a,
        even: n % 2 === 0 ? a : null,
        odd: n % 2 === 1 ? a : null,
      })
    }
    const { limsup, liminf } = limSupLimInfFinite(terms)
    return { chartData, stats: { limsup, liminf } }
  }, [preset, nMax])

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Subsequences</strong> select indexed terms{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('a_{n_k}') }} />. On a finite window,{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\limsup') }} /> /{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\liminf') }} /> are approximated by{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\min_k \\max_{j\\ge k} a_j') }} /> and{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\max_k \\min_{j\\ge k} a_j') }} /> (tail extrema). Even / odd
          subsequences are highlighted.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>Sequence</span>
            <select className={mc.select} value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)}>
              <option value="osc">sin(ln(n+1)) + 0.3 sin(n)</option>
              <option value="neg">(-1)ⁿ</option>
              <option value="mix">(-1)ⁿ/n + 1/n²</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>n max</span>
            <input
              type="number"
              className={mc.input}
              min={30}
              max={800}
              step={10}
              value={nMax}
              onChange={(e) => setNMax(Math.max(10, Math.floor(Number(e.target.value) || 200)))}
            />
          </label>
        </div>
        <p className={mc.matrixHint}>
          Window lim sup ≈ {stats.limsup.toFixed(4)}, lim inf ≈ {stats.liminf.toFixed(4)}
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Terms and highlighted subsequences</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="n" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={44} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <ReferenceLine y={stats.limsup} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'limsup ~', fill: 'var(--text-muted)', fontSize: 10 }} />
              <ReferenceLine y={stats.liminf} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'liminf ~', fill: 'var(--text-muted)', fontSize: 10 }} />
              <Line type="monotone" dataKey="a" stroke="var(--text)" dot={false} strokeWidth={1} opacity={0.35} isAnimationActive={false} />
              <Line type="monotone" dataKey="even" stroke="var(--accent)" connectNulls={false} dot={{ r: 2 }} strokeWidth={0} isAnimationActive={false} />
              <Line type="monotone" dataKey="odd" stroke="#3b82f6" connectNulls={false} dot={{ r: 2 }} strokeWidth={0} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function CauchyPanel() {
  const [kind, setKind] = useState<'inv' | 'harm'>('inv')
  const [nMax, setNMax] = useState(120)

  const data = useMemo(() => {
    const terms: number[] = []
    for (let n = 1; n <= nMax; n++) {
      terms.push(kind === 'inv' ? 1 / n : harmonicPartial(n))
    }
    const out: { N: number; diameter: number }[] = []
    for (let N = 1; N <= nMax; N++) {
      out.push({ N, diameter: cauchyDiameterTail(terms, N - 1) })
    }
    return out
  }, [kind, nMax])

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          A sequence is <strong>Cauchy</strong> if tail diameters{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\sup_{m,n\\ge N} |a_m-a_n|') }} /> shrink to 0. On a finite window we plot the
          empirical max gap among terms with indices ≥ N (heuristic).
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>aₙ</span>
            <select className={mc.select} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="inv">1/n (Cauchy → 0)</option>
              <option value="harm">Hₙ harmonic partials (not Cauchy)</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>n max</span>
            <input
              type="number"
              className={mc.input}
              min={20}
              max={400}
              value={nMax}
              onChange={(e) => setNMax(Math.max(5, Math.floor(Number(e.target.value) || 120)))}
            />
          </label>
        </div>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Tail diameter vs N</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="N" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={52} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="diameter" stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={2} name="max gap" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

type EpsPreset = 'linear' | 'quad' | 'sqrt'

const EPS_PRESETS: Record<
  EpsPreset,
  { f: (x: number) => number; a: number; L: number; xl: number; xr: number; hint: string }
> = {
  linear: {
    f: (x) => 2 * x + 1,
    a: 1,
    L: 3,
    xl: -0.2,
    xr: 2.2,
    hint: 'δ = ε/2 always works since |f(x)-L| = 2|x-a|.',
  },
  quad: {
    f: (x) => x * x,
    a: 2,
    L: 4,
    xl: 0.3,
    xr: 3.4,
    hint: 'Near a=2, |f(x)-L| ≈ 4|x-2| for a first-order picture; smaller δ may be needed when ε is tiny.',
  },
  sqrt: {
    f: (x) => Math.sqrt(Math.max(x, 0)),
    a: 4,
    L: 2,
    xl: 0,
    xr: 6.5,
    hint: 'For x,a ≥ 0, |√x-√a| ≤ √|x-a| (useful bound); try δ = ε² initially.',
  },
}

export function EpsilonDeltaPanel() {
  const [preset, setPreset] = useState<EpsPreset>('linear')
  const [epsilon, setEpsilon] = useState(0.25)
  const [delta, setDelta] = useState(0.12)

  const cfg = EPS_PRESETS[preset]
  const curve = useMemo(
    () => sampleFunction(cfg.f, cfg.xl, cfg.xr, 280),
    [preset]
  )
  const ok = useMemo(
    () => epsilonDeltaHolds(cfg.f, cfg.a, cfg.L, delta, epsilon),
    [preset, delta, epsilon]
  )

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <span dangerouslySetInnerHTML={{ __html: tex('\\lim_{x\\to a} f(x) = L') }} /> means: ∀ε&gt;0 ∃δ&gt;0 such that{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('0<|x-a|<\\delta \\Rightarrow |f(x)-L|<\\varepsilon') }} />. Adjust δ and ε; we
          <strong> spot-check</strong> the implication on a uniform grid in{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('[a-\\delta, a+\\delta]') }} />.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>Example</span>
            <select className={mc.select} value={preset} onChange={(e) => setPreset(e.target.value as EpsPreset)}>
              <option value="linear">2x+1 at a=1, L=3</option>
              <option value="quad">x² at a=2, L=4</option>
              <option value="sqrt">√x at a=4, L=2</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>ε</span>
            <input
              type="range"
              min={0.02}
              max={0.8}
              step={0.02}
              value={epsilon}
              onChange={(e) => setEpsilon(Number(e.target.value))}
              style={{ width: 160 }}
            />
            <span className={mc.matrixHint}>{epsilon.toFixed(2)}</span>
          </label>
          <label className={mc.fieldLabel}>
            <span>δ</span>
            <input
              type="range"
              min={0.02}
              max={0.8}
              step={0.02}
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              style={{ width: 160 }}
            />
            <span className={mc.matrixHint}>{delta.toFixed(2)}</span>
          </label>
        </div>
        <p className={mc.hint}>{cfg.hint}</p>
        <p className={mc.matrixHint}>
          Grid check (closed interval):{' '}
          <strong style={{ color: ok ? 'var(--accent)' : 'var(--danger)' }}>{ok ? 'all sampled |f−L| < ε' : 'fails for some sample'}</strong>
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Graph and tolerance band</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={curve} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={44} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <ReferenceArea y1={cfg.L - epsilon} y2={cfg.L + epsilon} strokeOpacity={0} fill="var(--accent)" fillOpacity={0.12} />
              <ReferenceLine x={cfg.a - delta} stroke="#3b82f6" strokeDasharray="4 3" />
              <ReferenceLine x={cfg.a + delta} stroke="#3b82f6" strokeDasharray="4 3" />
              <ReferenceLine x={cfg.a} stroke="var(--text-muted)" />
              <ReferenceLine y={cfg.L} stroke="var(--accent)" strokeDasharray="5 4" />
              <Line type="monotone" dataKey="y" stroke="var(--text)" dot={false} isAnimationActive={false} strokeWidth={2} name="f" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

type DiscPreset = 'sininv' | 'removable' | 'jump' | 'signum'

function removableF(x: number): number {
  if (Math.abs(x - 1) < 1e-9) return NaN
  return (x * x - 1) / (x - 1)
}

function discF(which: DiscPreset, x: number): number {
  if (which === 'sininv') {
    if (Math.abs(x) < 1e-4) return NaN
    return Math.sin(1 / x)
  }
  if (which === 'removable') return removableF(x)
  if (which === 'jump') return x < 0 ? -1 : 1
  if (which === 'signum') {
    if (x < 0) return -1
    if (x > 0) return 1
    return 0
  }
  return NaN
}

export function DiscontinuityPanel() {
  const [preset, setPreset] = useState<DiscPreset>('sininv')

  const xl = preset === 'sininv' ? -0.8 : -2
  const xr = preset === 'sininv' ? 0.8 : 3

  const data = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const n = preset === 'sininv' ? 3000 : 800
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const x = xl + t * (xr - xl)
      const y = discF(preset, x)
      if (Number.isFinite(y)) pts.push({ x, y })
    }
    return pts
  }, [preset, xl, xr])

  const blurb =
    preset === 'sininv'
      ? 'Essential oscillation near 0: sin(1/x) has no limit at 0 (graph shows a deleted neighborhood of 0).'
      : preset === 'removable'
        ? '(x²−1)/(x−1) equals x+1 for x≠1; defining f(1)=2 removes the removable singularity.'
        : preset === 'jump'
          ? 'Step jump at 0: left limit −1, right limit +1.'
          : 'Signum: value at 0 can be assigned, but limits disagree from left/right unless you separate.'

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          Prototypes of <strong>discontinuity</strong>: oscillation, a removable hole via rational cancellation, a jump, and signum at a
          split point.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <label className={mc.fieldLabel}>
          <span>Example</span>
          <select className={mc.select} value={preset} onChange={(e) => setPreset(e.target.value as DiscPreset)}>
            <option value="sininv">sin(1/x)</option>
            <option value="removable">(x²−1)/(x−1)</option>
            <option value="jump">Step (±1)</option>
            <option value="signum">sgn(x)</option>
          </select>
        </label>
        <p className={mc.hint}>{blurb}</p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Graph</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={44} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="y" stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={1.2} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

type DQPreset = 'quad' | 'cubic' | 'sin' | 'exp'

const DQ_MAP: Record<DQPreset, (x: number) => number> = {
  quad: (x) => x * x,
  cubic: (x) => x * x * x,
  sin: Math.sin,
  exp: Math.exp,
}

export function DifferenceQuotientPanel() {
  const [preset, setPreset] = useState<DQPreset>('quad')
  const [a, setA] = useState(1)
  const [h, setH] = useState(0.4)

  const f = DQ_MAP[preset]
  const fp =
    preset === 'quad'
      ? 2 * a
      : preset === 'cubic'
        ? 3 * a * a
        : preset === 'sin'
          ? Math.cos(a)
          : Math.exp(a)

  const xl = Math.min(a - 1.2, a + h - 1)
  const xr = Math.max(a + 1.2, a + h + 1)

  const curve = useMemo(() => sampleFunction(f, xl, xr, 240), [preset, xl, xr])
  const mSec = (f(a + h) - f(a)) / h
  const secant = useMemo(
    () => [
      { x: a - 0.35, y: f(a) + mSec * (-0.35) },
      { x: a + h + 0.35, y: f(a) + mSec * (h + 0.35) },
    ],
    [a, h, preset]
  )

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          The <strong>difference quotient</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\frac{f(a+h)-f(a)}{h}') }} /> approximates{' '}
          <span dangerouslySetInnerHTML={{ __html: tex("f'(a)") }} /> as{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('h\\to 0') }} />.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>f</span>
            <select className={mc.select} value={preset} onChange={(e) => setPreset(e.target.value as DQPreset)}>
              <option value="quad">x²</option>
              <option value="cubic">x³</option>
              <option value="sin">sin x</option>
              <option value="exp">eˣ</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>a</span>
            <input type="number" className={mc.input} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>h</span>
            <input
              type="number"
              className={mc.input}
              min={0.001}
              max={1.2}
              step={0.005}
              value={h}
              onChange={(e) => setH(Math.max(1e-6, Number(e.target.value) || 0.05))}
            />
          </label>
        </div>
        <p className={mc.matrixHint}>
          Secant slope ≈ {mSec.toFixed(4)} · true f′(a) ≈ {fp.toFixed(4)}
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Curve and secant direction</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={48} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line data={curve} type="monotone" dataKey="y" stroke="var(--text)" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Line data={secant} type="linear" dataKey="y" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={1.5} strokeDasharray="6 4" />
              <Scatter data={[{ x: a, y: f(a) }, { x: a + h, y: f(a + h) }]} fill="var(--accent)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function mvtCubic(x: number): number {
  return x * x * x - x
}

function mvtCubicPrime(x: number): number {
  return 3 * x * x - 1
}

function pickMvtC(a: number, b: number, m: number): number | null {
  if (m + 1 < -1e-9) return null
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const s = Math.sqrt(Math.max((m + 1) / 3, 0))
  for (const c of [-s, s]) {
    if (c > lo + 1e-6 && c < hi - 1e-6) return c
  }
  return null
}

export function MVTpanel() {
  const [a, setA] = useState(-1.4)
  const [b, setB] = useState(1.7)

  const fa = mvtCubic(a)
  const fb = mvtCubic(b)
  const m = (fb - fa) / (b - a)
  const c = pickMvtC(a, b, m)
  const curve = useMemo(() => sampleFunction(mvtCubic, -2.2, 2.2, 260), [])

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Mean value theorem</strong> (MVT): for differentiable <span dangerouslySetInnerHTML={{ __html: tex('f') }} /> on{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('[a,b]') }} />, ∃<span dangerouslySetInnerHTML={{ __html: tex('c') }} /> with{' '}
          <span dangerouslySetInnerHTML={{ __html: tex("f'(c) = \\frac{f(b)-f(a)}{b-a}") }} />.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>a</span>
            <input type="number" className={mc.input} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>b</span>
            <input type="number" className={mc.input} step={0.1} value={b} onChange={(e) => setB(Number(e.target.value))} />
          </label>
        </div>
        <p className={mc.hint}>
          f(x) = x³ − x. Secant slope m ≈ {m.toFixed(4)}
          {c === null
            ? ' — no interior c found with f′(c)=m on this window (try a wider interval).'
            : ` — example c ≈ ${c.toFixed(4)}, f′(c) ≈ ${mvtCubicPrime(c).toFixed(4)}.`}
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Cubic, chord, and tangent</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={44} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line data={curve} type="monotone" dataKey="y" stroke="var(--text)" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Line
                data={[
                  { x: a, y: fa },
                  { x: b, y: fb },
                ]}
                type="linear"
                dataKey="y"
                stroke="var(--accent)"
                dot={{ r: 3 }}
                isAnimationActive={false}
                strokeWidth={2}
              />
              {c !== null && (
                <Line
                  data={[
                    { x: c - 0.7, y: mvtCubic(c) + mvtCubicPrime(c) * (-0.7) },
                    { x: c + 0.7, y: mvtCubic(c) + mvtCubicPrime(c) * 0.7 },
                  ]}
                  type="linear"
                  dataKey="y"
                  stroke="#3b82f6"
                  dot={false}
                  isAnimationActive={false}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function evtFunction(x: number): number {
  return -0.5 * x * x * x + x * x + 1.2 * Math.sin(1.5 * x) + 0.6
}

export function EVTPanel() {
  const [a, setA] = useState(-1.8)
  const [b, setB] = useState(2.4)

  const lo = Math.min(a, b)
  const hi = Math.max(a, b)

  const curve = useMemo(() => {
    const left = lo - 0.45 * Math.max(1, hi - lo)
    const right = hi + 0.45 * Math.max(1, hi - lo)
    return sampleFunction(evtFunction, left, right, 320)
  }, [lo, hi])

  const extrema = useMemo(() => {
    const points: { x: number; y: number }[] = []
    let minPoint = { x: lo, y: evtFunction(lo) }
    let maxPoint = { x: lo, y: evtFunction(lo) }
    const samples = 320
    for (let i = 0; i <= samples; i++) {
      const x = lo + ((hi - lo) * i) / samples
      const y = evtFunction(x)
      const point = { x, y }
      points.push(point)
      if (y < minPoint.y) minPoint = point
      if (y > maxPoint.y) maxPoint = point
    }
    return { minPoint, maxPoint }
  }, [lo, hi])

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Extreme value theorem</strong>: if <span dangerouslySetInnerHTML={{ __html: tex('f') }} /> is continuous on a closed interval{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('[a,b]') }} />, then <span dangerouslySetInnerHTML={{ __html: tex('f') }} /> attains both a minimum and a maximum on that interval.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>a</span>
            <input type="number" className={mc.input} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>b</span>
            <input type="number" className={mc.input} step={0.1} value={b} onChange={(e) => setB(Number(e.target.value))} />
          </label>
        </div>
        <p className={mc.hint}>
          On [{lo.toFixed(1)}, {hi.toFixed(1)}], the sampled minimum is {extrema.minPoint.y.toFixed(4)} at x ≈ {extrema.minPoint.x.toFixed(3)} and the sampled maximum is {extrema.maxPoint.y.toFixed(4)} at x ≈ {extrema.maxPoint.x.toFixed(3)}.
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Continuous curve with attained extrema</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={48} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <ReferenceLine x={lo} stroke="#3b82f6" strokeDasharray="4 3" />
              <ReferenceLine x={hi} stroke="#3b82f6" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="y" stroke="var(--text)" dot={false} isAnimationActive={false} strokeWidth={2} />
              <Scatter data={[extrema.minPoint]} fill="#ef4444" name="minimum" />
              <Scatter data={[extrema.maxPoint]} fill="var(--accent)" name="maximum" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function ivtFunction(x: number): number {
  return x * x * x - x - 1
}

export function IVTPanel() {
  const [a, setA] = useState(1)
  const [b, setB] = useState(1.6)
  const [target, setTarget] = useState(0)

  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const fLo = ivtFunction(lo)
  const fHi = ivtFunction(hi)
  const minY = Math.min(fLo, fHi)
  const maxY = Math.max(fLo, fHi)
  const containsTarget = target >= minY && target <= maxY

  const curve = useMemo(() => {
    const left = lo - 0.45 * Math.max(1, hi - lo)
    const right = hi + 0.45 * Math.max(1, hi - lo)
    const out: { x: number; y: number; shifted: number }[] = []
    for (let i = 0; i <= 320; i++) {
      const x = left + ((right - left) * i) / 320
      const y = ivtFunction(x)
      out.push({ x, y, shifted: y - target })
    }
    return out
  }, [lo, hi, target])

  const approximateWitness = useMemo(() => {
    if (!containsTarget) return null
    let best = { x: lo, y: fLo, gap: Math.abs(fLo - target) }
    const samples = 600
    for (let i = 0; i <= samples; i++) {
      const x = lo + ((hi - lo) * i) / samples
      const y = ivtFunction(x)
      const gap = Math.abs(y - target)
      if (gap < best.gap) best = { x, y, gap }
    }
    return best
  }, [lo, hi, target, containsTarget, fLo])

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Intermediate value theorem</strong>: if <span dangerouslySetInnerHTML={{ __html: tex('f') }} /> is continuous on{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('[a,b]') }} />, then every value between <span dangerouslySetInnerHTML={{ __html: tex('f(a)') }} /> and{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('f(b)') }} /> is attained somewhere in the interval.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>a</span>
            <input type="number" className={mc.input} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>b</span>
            <input type="number" className={mc.input} step={0.1} value={b} onChange={(e) => setB(Number(e.target.value))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>Target value L</span>
            <input
              type="number"
              className={mc.input}
              step={0.1}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </label>
        </div>
        <p className={mc.hint}>
          For f(x) = x^3 - x - 1 on [{lo.toFixed(1)}, {hi.toFixed(1)}], f(a) ≈ {fLo.toFixed(4)} and f(b) ≈ {fHi.toFixed(4)}.
          {containsTarget
            ? approximateWitness
              ? ` Since ${target.toFixed(2)} lies between them, IVT predicts a c with f(c) = ${target.toFixed(2)}; sampled witness c ≈ ${approximateWitness.x.toFixed(4)}.`
              : ` Since ${target.toFixed(2)} lies between them, IVT predicts a c with f(c) = ${target.toFixed(2)}.`
            : ` ${target.toFixed(2)} is outside the endpoint value range, so IVT does not guarantee a solution on this interval.`}
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Continuous curve crossing the target band</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={48} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <ReferenceLine x={lo} stroke="#3b82f6" strokeDasharray="4 3" />
              <ReferenceLine x={hi} stroke="#3b82f6" strokeDasharray="4 3" />
              <ReferenceLine y={target} stroke="var(--accent)" strokeDasharray="5 4" />
              <Line type="monotone" dataKey="y" stroke="var(--text)" dot={false} isAnimationActive={false} strokeWidth={2} />
              {approximateWitness && <Scatter data={[{ x: approximateWitness.x, y: approximateWitness.y }]} fill="var(--accent)" name="witness" />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

type TaylorPreset = 'exp' | 'sin' | 'cos'

function factorial(n: number): number {
  let out = 1
  for (let k = 2; k <= n; k++) out *= k
  return out
}

function taylorTerm(preset: TaylorPreset, n: number, x: number): number {
  if (preset === 'exp') return Math.pow(x, n) / factorial(n)
  if (preset === 'sin') {
    if (n % 2 === 0) return 0
    const m = (n - 1) / 2
    return (m % 2 === 0 ? 1 : -1) * Math.pow(x, n) / factorial(n)
  }
  if (n % 2 === 1) return 0
  const m = n / 2
  return (m % 2 === 0 ? 1 : -1) * Math.pow(x, n) / factorial(n)
}

function taylorApproximation(preset: TaylorPreset, degree: number, x: number): number {
  let sum = 0
  for (let n = 0; n <= degree; n++) sum += taylorTerm(preset, n, x)
  return sum
}

function exactTaylorFunction(preset: TaylorPreset, x: number): number {
  if (preset === 'exp') return Math.exp(x)
  if (preset === 'sin') return Math.sin(x)
  return Math.cos(x)
}

export function TaylorSeriesPanel() {
  const [preset, setPreset] = useState<TaylorPreset>('exp')
  const [degree, setDegree] = useState(5)
  const [x0, setX0] = useState(0.8)

  const xMin = -3
  const xMax = 3
  const chartData = useMemo(() => {
    const out: { x: number; exact: number; approx: number }[] = []
    for (let i = 0; i <= 260; i++) {
      const x = xMin + ((xMax - xMin) * i) / 260
      out.push({
        x,
        exact: exactTaylorFunction(preset, x),
        approx: taylorApproximation(preset, degree, x),
      })
    }
    return out
  }, [preset, degree])

  const exactAtX0 = exactTaylorFunction(preset, x0)
  const approxAtX0 = taylorApproximation(preset, degree, x0)
  const error = approxAtX0 - exactAtX0

  const formula =
    preset === 'exp'
      ? 'e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}'
      : preset === 'sin'
        ? '\\sin x = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\cdots'
        : '\\cos x = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots'

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Taylor series</strong> replace a smooth function with a polynomial built from derivatives at a center. Here we use Maclaurin series (center{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('0') }} />) and compare the truncated polynomial with the exact function.
        </p>
        <p className={mc.introFormula} dangerouslySetInnerHTML={{ __html: tex(formula, true) }} />
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>Function</span>
            <select className={mc.select} value={preset} onChange={(e) => setPreset(e.target.value as TaylorPreset)}>
              <option value="exp">e^x</option>
              <option value="sin">sin x</option>
              <option value="cos">cos x</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>Degree</span>
            <input
              type="number"
              className={mc.input}
              min={0}
              max={12}
              step={1}
              value={degree}
              onChange={(e) => setDegree(Math.max(0, Math.min(12, Math.floor(Number(e.target.value) || 0))))}
            />
          </label>
          <label className={mc.fieldLabel}>
            <span>Evaluate at x</span>
            <input
              type="number"
              className={mc.input}
              min={-3}
              max={3}
              step={0.1}
              value={x0}
              onChange={(e) => setX0(Number(e.target.value))}
            />
          </label>
        </div>
        <p className={mc.hint}>
          At x = {x0.toFixed(2)}, polynomial ≈ {approxAtX0.toFixed(6)}, exact value ≈ {exactAtX0.toFixed(6)}, error ≈ {error.toExponential(2)}.
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Exact function vs Taylor polynomial</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={52} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <ReferenceLine x={x0} stroke="#3b82f6" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="exact" stroke="var(--text)" dot={false} strokeWidth={2} isAnimationActive={false} name="exact" />
              <Line type="monotone" dataKey="approx" stroke="var(--accent)" dot={false} strokeWidth={2} strokeDasharray="6 4" isAnimationActive={false} name="Taylor" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

type RiePreset = 'quad' | 'sin'

const RIE: Record<RiePreset, { f: (x: number) => number; a: number; b: number; exact: number; label: string }> = {
  quad: {
    f: (x) => x * x,
    a: 0,
    b: 2,
    exact: 8 / 3,
    label: '∫₀² x² dx = 8/3',
  },
  sin: {
    f: (x) => Math.sin(Math.PI * x),
    a: 0,
    b: 1,
    exact: 2 / Math.PI,
    label: '∫₀¹ sin(πx) dx = 2/π',
  },
}

export function RiemannPanel() {
  const [preset, setPreset] = useState<RiePreset>('quad')
  const [n, setN] = useState(12)
  const [method, setMethod] = useState<RiemannMethod>('mid')

  const cfg = RIE[preset]
  const approx = riemannSum(cfg.f, cfg.a, cfg.b, n, method)
  const err = approx - cfg.exact

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Riemann sums</strong> approximate{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\int_a^b f(x)\\,dx') }} /> using sampled heights on a partition. Compare left, midpoint,
          right, and trapezoid rules.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>Integrand</span>
            <select className={mc.select} value={preset} onChange={(e) => setPreset(e.target.value as RiePreset)}>
              <option value="quad">x² on [0,2]</option>
              <option value="sin">sin(πx) on [0,1]</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>Subintervals n</span>
            <input
              type="number"
              className={mc.input}
              min={2}
              max={200}
              value={n}
              onChange={(e) => setN(Math.max(2, Math.floor(Number(e.target.value) || 12)))}
            />
          </label>
          <label className={mc.fieldLabel}>
            <span>Rule</span>
            <select className={mc.select} value={method} onChange={(e) => setMethod(e.target.value as RiemannMethod)}>
              <option value="left">Left</option>
              <option value="mid">Midpoint</option>
              <option value="right">Right</option>
              <option value="trap">Trapezoid</option>
            </select>
          </label>
        </div>
        <p className={mc.matrixHint}>
          {cfg.label}. Approximation ≈ {approx.toFixed(6)}, error ≈ {err.toExponential(2)}
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>f and partition idea</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={sampleFunction(cfg.f, cfg.a - (cfg.b - cfg.a) * 0.05, cfg.b + (cfg.b - cfg.a) * 0.05, 200)} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={44} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="y" stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function ImproperPanel() {
  const [kind, setKind] = useState<'t1' | 't2'>('t1')
  const [p, setP] = useState(1.5)
  const [R, setR] = useState(5)
  const [eps, setEps] = useState(0.08)

  const t1 = useMemo(() => {
    const pts: { u: number; val: number }[] = []
    for (let k = 0; k <= 80; k++) {
      const u = 1 + (Math.max(R, 1.05) - 1) * (k / 80)
      pts.push({ u, val: improperType1Integral(p, u) })
    }
    return pts
  }, [p, R])

  const t2 = useMemo(() => {
    const pts: { u: number; val: number }[] = []
    for (let k = 0; k <= 80; k++) {
      const u = 1e-4 + (0.5 - 1e-4) * (k / 80)
      pts.push({ u, val: improperType2Integral(p, u) })
    }
    return pts
  }, [p])

  const valNow = kind === 't1' ? improperType1Integral(p, Math.max(R, 1.001)) : improperType2Integral(p, Math.min(Math.max(eps, 1e-4), 0.999))

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Improper integrals</strong>: blow-up at ∞ (type I) or at an endpoint (type II). The plots show truncated antiderivatives;
          convergence depends on <span dangerouslySetInnerHTML={{ __html: tex('p') }} />.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>Type</span>
            <select className={mc.select} value={kind} onChange={(e) => setKind(e.target.value as 't1' | 't2')}>
              <option value="t1">∫₁ᴿ x⁻ᵖ dx (R → ∞)</option>
              <option value="t2">∫ε¹ x⁻ᵖ dx (ε → 0⁺)</option>
            </select>
          </label>
          <label className={mc.fieldLabel}>
            <span>p</span>
            <input type="number" className={mc.input} min={0.25} max={3} step={0.05} value={p} onChange={(e) => setP(Number(e.target.value) || 1)} />
          </label>
          {kind === 't1' && (
            <label className={mc.fieldLabel}>
              <span>R</span>
              <input type="number" className={mc.input} min={1.01} max={200} step={0.5} value={R} onChange={(e) => setR(Math.max(1.01, Number(e.target.value)))} />
            </label>
          )}
          {kind === 't2' && (
            <label className={mc.fieldLabel}>
              <span>ε</span>
              <input type="number" className={mc.input} min={1e-4} max={0.5} step={0.005} value={eps} onChange={(e) => setEps(Math.max(1e-6, Number(e.target.value)))} />
            </label>
          )}
        </div>
        <p className={mc.hint}>
          At current settings: value ≈ {Number.isFinite(valNow) ? valNow.toFixed(5) : '—'}. Type I converges for p&gt;1; type II on (0,1] converges for
          p&lt;1.
        </p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Truncation curve</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={kind === 't1' ? t1 : t2} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="u" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={52} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="val" stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function UniformConvergencePanel() {
  const [b, setB] = useState(0.85)
  const [n, setN] = useState(8)

  const xs = useMemo(() => {
    const pts: { x: number; fn: number }[] = []
    for (let i = 0; i <= 200; i++) {
      const x = (b * i) / 200
      pts.push({ x, fn: Math.pow(x, n) })
    }
    return pts
  }, [b, n])

  const supErr = Math.pow(b, n)

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          <strong>Uniform convergence</strong> on a set <span dangerouslySetInnerHTML={{ __html: tex('S') }} /> means{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\sup_{x\\in S} |f_n(x)-f(x)| \\to 0') }} />. Classic{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('x^n') }} /> on <span dangerouslySetInnerHTML={{ __html: tex('[0,1]') }} /> fails
          uniformly to the pointwise limit (mass escapes to <span dangerouslySetInnerHTML={{ __html: tex('x=1') }} />), but on{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('[0,b]') }} /> with <span dangerouslySetInnerHTML={{ __html: tex('b<1') }} /> the sup
          norm decays as <span dangerouslySetInnerHTML={{ __html: tex('b^n') }} />.
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>b (domain [0,b])</span>
            <input type="number" className={mc.input} min={0.05} max={1} step={0.01} value={b} onChange={(e) => setB(Math.min(1, Math.max(0.01, Number(e.target.value))))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>n in xⁿ</span>
            <input type="number" className={mc.input} min={1} max={80} value={n} onChange={(e) => setN(Math.max(1, Math.floor(Number(e.target.value) || 8)))} />
          </label>
        </div>
        <p className={mc.matrixHint}>Sup |xⁿ − 0| on [0,b] = bⁿ ≈ {supErr.toExponential(3)}</p>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>xⁿ on [0, b]</h3>
        <div className={hub.chartBox}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={xs} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis domain={[0, 1.05]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" width={36} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="fn" stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function TopologyPanel() {
  const [a, setA] = useState(0.2)
  const [b, setB] = useState(0.75)
  const [c, setC] = useState(0.45)
  const [eps, setEps] = useState(0.08)
  const [cantorSteps, setCantorSteps] = useState(3)

  const xmin = 0
  const xmax = 1
  const toPct = (x: number) => `${8 + ((x - xmin) / (xmax - xmin)) * 84}%`
  const widthPct = (x0: number, x1: number) => `${((x1 - x0) / (xmax - xmin)) * 84}%`

  const intervals = useMemo(() => cantorIntervals(cantorSteps), [cantorSteps])

  return (
    <div className={mc.section}>
      <div className={mc.intro}>
        <p className={mc.introText}>
          Quick <strong>topology on the line</strong>: visualize a closed interval, an ε-neighborhood, and finite stages of the middle-thirds Cantor set
          (a nowhere-dense, totally disconnected fractal limit).
        </p>
      </div>
      <div className={mc.editorBlock}>
        <div className={mc.theoreticalForm}>
          <label className={mc.fieldLabel}>
            <span>interval [a,b]</span>
            <input type="number" className={mc.input} min={0} max={1} step={0.01} value={a} onChange={(e) => setA(Number(e.target.value))} />
            <input type="number" className={mc.input} min={0} max={1} step={0.01} value={b} onChange={(e) => setB(Number(e.target.value))} />
          </label>
          <label className={mc.fieldLabel}>
            <span>center c, ε</span>
            <input type="number" className={mc.input} min={0} max={1} step={0.01} value={c} onChange={(e) => setC(Number(e.target.value))} />
            <input type="range" min={0.02} max={0.25} step={0.01} value={eps} onChange={(e) => setEps(Number(e.target.value))} />
            <span className={mc.matrixHint}>{eps.toFixed(2)}</span>
          </label>
          <label className={mc.fieldLabel}>
            <span>Cantor iterations</span>
            <input type="number" className={mc.input} min={0} max={7} value={cantorSteps} onChange={(e) => setCantorSteps(Math.max(0, Math.min(8, Math.floor(Number(e.target.value)))))} />
          </label>
        </div>
      </div>
      <div className={mc.graphBlock}>
        <h3 className={mc.graphTitle}>Number line [0, 1]</h3>
        <div className={hub.numberLine}>
          <div className={hub.numberLineAxis} />
          <div
            className={hub.intervalBar}
            style={{ left: toPct(Math.min(a, b)), width: widthPct(Math.min(a, b), Math.max(a, b)) }}
            title="[a,b]"
          />
          <div
            className={hub.epsNeighborhood}
            style={{ left: toPct(Math.max(0, c - eps)), width: widthPct(Math.max(0, c - eps), Math.min(1, c + eps)) }}
            title="(c−ε,c+ε)"
          />
        </div>
        <p className={mc.hint}>Orange: interval [a,b]. Blue: ε-neighborhood clipped to [0,1].</p>
        <div className={hub.cantorRow}>
          <span className={hub.cantorStep}>Cantor (step {cantorSteps}): {intervals.length} intervals</span>
          <div className={hub.numberLine}>
            <div className={hub.numberLineAxis} />
            {intervals.map(([ia, ib], idx) => (
              <div
                key={`${idx}-${ia}-${ib}`}
                className={hub.intervalBar}
                style={{ left: toPct(ia), width: widthPct(ia, ib) }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
