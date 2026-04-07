import { useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  SEQUENCE_PRESETS,
  buildSequenceChartData,
  findTailN,
  theoreticalLimit,
  type SequenceParams,
  type SequencePresetId,
} from '@/lib/sequenceConvergence'
import styles from './MarkovChainSection.module.css'

function tex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const DEFAULT_PARAMS: SequenceParams = { p: 2, r: 0.7 }

export function SequenceConvergenceSection() {
  const [presetId, setPresetId] = useState<SequencePresetId>('inv-n')
  const [params, setParams] = useState<SequenceParams>(() => ({ ...DEFAULT_PARAMS }))
  const [nMax, setNMax] = useState(500)
  const [epsilon, setEpsilon] = useState(0.05)

  const preset = SEQUENCE_PRESETS.find((p) => p.id === presetId)!

  const chartData = useMemo(
    () => buildSequenceChartData(presetId, params, nMax),
    [presetId, params, nMax]
  )

  const L = useMemo(() => theoreticalLimit(presetId, params), [presetId, params])

  const terms = useMemo(() => chartData.map((d) => d.a), [chartData])

  const tailN = useMemo(() => {
    if (L === null) return null
    return findTailN(terms, L, epsilon)
  }, [terms, L, epsilon])

  const yDomain = useMemo(() => {
    const finite = chartData.map((d) => d.a).filter(Number.isFinite)
    if (finite.length === 0) return [-1, 1] as [number, number]
    let lo = Math.min(...finite)
    let hi = Math.max(...finite)
    if (L !== null) {
      lo = Math.min(lo, L - epsilon)
      hi = Math.max(hi, L + epsilon)
      lo = Math.min(lo, L)
      hi = Math.max(hi, L)
    }
    const span = hi - lo || 1
    const pad = span * 0.08 || 0.05
    return [lo - pad, hi + pad] as [number, number]
  }, [chartData, L, epsilon])

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          A real sequence <span dangerouslySetInnerHTML={{ __html: tex('(a_n)_{n\\ge 1}') }} />{' '}
          <strong>converges</strong> to <span dangerouslySetInnerHTML={{ __html: tex('L \\in \\mathbb{R}') }} /> if
          for every <span dangerouslySetInnerHTML={{ __html: tex('\\varepsilon > 0') }} /> there exists{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('N') }} /> such that{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('|a_n - L| < \\varepsilon') }} /> for all{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('n \\ge N') }} />. The plot shows terms{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('a_n') }} /> versus <span dangerouslySetInnerHTML={{ __html: tex('n') }} />.
        </p>
        <p
          className={styles.introFormula}
          dangerouslySetInnerHTML={{
            __html: tex(
              '\\lim_{n\\to\\infty} a_n = L \\;\\;\\Longleftrightarrow\\;\\; \\forall \\varepsilon>0\\;\\;\\exists N\\;\\;\\forall n\\ge N:\\; |a_n - L| < \\varepsilon',
              true
            ),
          }}
        />
        <p className={styles.introText}>
          Pick a preset, adjust parameters, and (when a limit exists) choose <span dangerouslySetInnerHTML={{ __html: tex('\\varepsilon') }} />.
          The shaded band is <span dangerouslySetInnerHTML={{ __html: tex('(L-\\varepsilon, L+\\varepsilon)') }} />. On a finite horizon{' '}
          <span dangerouslySetInnerHTML={{ __html: tex('n \\le n_{\\max}') }} />, we report the smallest <span dangerouslySetInnerHTML={{ __html: tex('N') }} /> such that
          all plotted terms from <span dangerouslySetInnerHTML={{ __html: tex('N') }} /> onward stay inside the band—when such an <span dangerouslySetInnerHTML={{ __html: tex('N') }} /> exists in range.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Sequence</h3>
        <p
          className={styles.theoreticalHint}
          dangerouslySetInnerHTML={{ __html: tex(preset.latex) }}
        />
        <p className={styles.hint}>{preset.description}</p>

        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Preset</span>
            <select
              className={styles.select}
              value={presetId}
              onChange={(e) => setPresetId(e.target.value as SequencePresetId)}
            >
              {SEQUENCE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          {preset.hasP && (
            <label className={styles.fieldLabel}>
              <span>p (power)</span>
              <input
                type="number"
                className={styles.input}
                min={0.1}
                max={10}
                step={0.1}
                value={params.p}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, p: Number(e.target.value) || 0.1 }))
                }
              />
            </label>
          )}

          {preset.hasR && (
            <label className={styles.fieldLabel}>
              <span>r (base)</span>
              <input
                type="number"
                className={styles.input}
                min={-1.5}
                max={1.5}
                step={0.05}
                value={params.r}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, r: Number(e.target.value) || 0 }))
                }
              />
            </label>
          )}

          <label className={styles.fieldLabel}>
            <span>nₘₐₓ (terms plotted)</span>
            <input
              type="number"
              className={styles.input}
              min={20}
              max={5000}
              step={10}
              value={nMax}
              onChange={(e) =>
                setNMax(Math.max(1, Math.min(20000, Math.floor(Number(e.target.value) || 500))))
              }
            />
          </label>
        </div>

        {L !== null && (
          <div className={styles.simulateBlock} style={{ marginTop: '1rem' }}>
            <h4 className={styles.simulateTitle}>ε–N view</h4>
            <p className={styles.simulateHint}>
              Limit{' '}
              {Math.abs(L - Math.E) < 1e-9 ? (
                <span dangerouslySetInnerHTML={{ __html: tex('L = e') }} />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: tex(`L = ${L}`) }} />
              )}{' '}
              (≈ {L.toFixed(8)}). Drag ε; the band tightens around L.
            </p>
            <label className={styles.fieldLabel} style={{ marginTop: '0.5rem', maxWidth: '100%' }}>
              <span>ε = {epsilon.toFixed(4)}</span>
              <input
                type="range"
                min={0.0005}
                max={0.5}
                step={0.0005}
                value={epsilon}
                onChange={(e) => setEpsilon(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
            <p className={styles.convergenceValue}>
              {tailN !== null ? (
                <>
                  On this window, terms stay in the band for all{' '}
                  <span dangerouslySetInnerHTML={{ __html: tex(`n \\ge ${tailN}`) }} /> (first such index found).
                </>
              ) : (
                <>
                  No index <span dangerouslySetInnerHTML={{ __html: tex('N') }} /> in 1…{nMax} keeps the entire tail inside
                  the band—increase <span dangerouslySetInnerHTML={{ __html: tex('n_{\\max}') }} /> or ε.
                </>
              )}
            </p>
          </div>
        )}

        {L === null && (
          <p className={styles.hint} style={{ marginTop: '0.75rem' }}>
            This preset has no single real limit on the plot (oscillation, growth, or slow divergence). The ε–N band is
            hidden; use the curve to compare qualitative behavior.
          </p>
        )}
      </div>

      <div className={styles.graphBlock}>
        <h3 className={styles.graphTitle}>Terms aₙ vs n</h3>
        <div className={styles.chartBlock}>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="n"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                stroke="var(--border)"
                label={{ value: 'n', position: 'insideBottomRight', offset: -4, fill: 'var(--text-muted)' }}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                stroke="var(--border)"
                width={56}
                label={{
                  value: 'aₙ',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--text-muted)',
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
                formatter={(value: number) => [value.toPrecision(6), 'aₙ']}
                labelFormatter={(n) => `n = ${n}`}
              />
              {L !== null && (
                <>
                  <ReferenceArea
                    y1={L - epsilon}
                    y2={L + epsilon}
                    strokeOpacity={0}
                    fill="var(--accent)"
                    fillOpacity={0.12}
                  />
                  <ReferenceLine
                    y={L}
                    stroke="var(--accent)"
                    strokeDasharray="6 4"
                    label={{
                      value: 'L',
                      fill: 'var(--accent)',
                      fontSize: 12,
                    }}
                  />
                </>
              )}
              <Line
                type="monotone"
                dataKey="a"
                stroke="var(--text)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
