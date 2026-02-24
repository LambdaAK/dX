import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  ReferenceLine,
} from 'recharts'
import {
  train,
  boundaryLine,
  generateDataset,
  type DataPoint,
  type TrainResult,
} from '@/lib/perceptron'
import { createSeededRng } from '@/lib/random'
import styles from './MarkovChainSection.module.css'

function renderLatex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

type Preset = 'blobs' | 'diagonal' | 'vertical' | 'wide-margin'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'blobs', label: 'Two blobs' },
  { id: 'diagonal', label: 'Diagonal boundary' },
  { id: 'vertical', label: 'Vertical split' },
  { id: 'wide-margin', label: 'Wide margin' },
]

const DOMAIN = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }

const COLOR_POS = 'var(--accent)'
const COLOR_NEG = '#0ea5e9'
const COLOR_BOUNDARY = '#f97316'

export function PerceptronSection() {
  const [preset, setPreset] = useState<Preset>('blobs')
  const [nPerClass, setNPerClass] = useState(40)
  const [learningRate, setLearningRate] = useState(1)
  const [maxEpochs, setMaxEpochs] = useState(50)
  const [seed, setSeed] = useState('')
  const [data, setData] = useState<DataPoint[]>([])
  const [result, setResult] = useState<TrainResult | null>(null)

  const handleRun = () => {
    const rand =
      seed.trim() !== '' && !Number.isNaN(Number(seed))
        ? createSeededRng(Number(seed))
        : Math.random
    const pts = generateDataset(preset, nPerClass, rand)
    setData(pts)
    const res = train(pts, { learningRate, maxEpochs })
    setResult(res)
  }

  const pos = useMemo(() => data.filter((p) => p.label === 1), [data])
  const neg = useMemo(() => data.filter((p) => p.label === -1), [data])

  const boundary = useMemo(() => {
    if (!result) return []
    return boundaryLine(result.model, DOMAIN.xMin, DOMAIN.xMax, DOMAIN.yMin, DOMAIN.yMax)
  }, [result])

  const accuracy = useMemo(() => {
    if (!result || data.length === 0) return null
    let correct = 0
    for (const pt of data) {
      const pred =
        result.model.w1 * pt.x + result.model.w2 * pt.y + result.model.b >= 0 ? 1 : -1
      if (pred === pt.label) correct++
    }
    return (correct / data.length) * 100
  }, [result, data])

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          <strong>Perceptron</strong> is the simplest linear binary classifier. It learns a
          hyperplane{' '}
          <span
            dangerouslySetInnerHTML={{
              __html: renderLatex('\\hat{y} = \\operatorname{sign}(w_1 x_1 + w_2 x_2 + b)'),
            }}
          />{' '}
          by updating weights whenever a point is misclassified:
        </p>
        <p
          className={styles.introFormula}
          dangerouslySetInnerHTML={{
            __html: renderLatex(
              '\\mathbf{w} \\leftarrow \\mathbf{w} + \\eta\\, y_i\\, \\mathbf{x}_i, \\quad b \\leftarrow b + \\eta\\, y_i',
              true
            ),
          }}
        />
        <p className={styles.introText}>
          By Rosenblatt's convergence theorem, training is guaranteed to converge in finite
          steps if (and only if) the data is linearly separable.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Dataset & training</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          <label className={styles.fieldLabel}>
            <span>Preset</span>
            <select
              className={styles.input}
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value as Preset)
                setResult(null)
                setData([])
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fieldLabel}>
            <span>Points per class</span>
            <input
              type="number"
              min={5}
              max={200}
              value={nPerClass}
              onChange={(e) => setNPerClass(Math.max(5, Math.min(200, Number(e.target.value))))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Learning rate η</span>
            <input
              type="number"
              min={0.01}
              max={10}
              step={0.1}
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Max epochs</span>
            <input
              type="number"
              min={1}
              max={1000}
              step={10}
              value={maxEpochs}
              onChange={(e) => setMaxEpochs(Math.max(1, Math.min(1000, Number(e.target.value))))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Seed (optional)</span>
            <input
              type="text"
              placeholder="Random"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>
        <button type="button" className={styles.runBtn} onClick={handleRun} style={{ marginTop: '4px' }}>
          Generate &amp; train
        </button>
      </div>

      {result && data.length > 0 && (
        <>
          <div className={styles.graphBlock}>
            <h3 className={styles.graphTitle}>Decision boundary</h3>
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[DOMAIN.xMin, DOMAIN.xMax]}
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  label={{ value: 'x₁', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[DOMAIN.yMin, DOMAIN.yMax]}
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  label={{ value: 'x₂', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <ZAxis range={[50, 50]} />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  contentStyle={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number) => [value.toFixed(3), '']}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]
                      ? `(${payload[0].payload?.x?.toFixed(3)}, ${payload[0].payload?.y?.toFixed(3)})`
                      : ''
                  }
                />
                <Scatter
                  name="+1"
                  data={pos}
                  fill={COLOR_POS}
                  isAnimationActive={false}
                />
                <Scatter
                  name="−1"
                  data={neg}
                  fill={COLOR_NEG}
                  isAnimationActive={false}
                />
                {boundary.length === 2 && (
                  <Line
                    name="Boundary"
                    data={boundary}
                    type="linear"
                    dataKey="y"
                    stroke={COLOR_BOUNDARY}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                    legendType="line"
                  />
                )}
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.matrixBlock}>
            <h4 className={styles.matrixTitle}>Training results</h4>
            <div className={styles.matrixWrap}>
              <table className={styles.matrixTable}>
                <tbody>
                  <tr>
                    <th className={styles.matrixRowHeader}>w₁</th>
                    <td className={styles.matrixCell}>{result.model.w1.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <th className={styles.matrixRowHeader}>w₂</th>
                    <td className={styles.matrixCell}>{result.model.w2.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <th className={styles.matrixRowHeader}>bias b</th>
                    <td className={styles.matrixCell}>{result.model.b.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <th className={styles.matrixRowHeader}>Epochs run</th>
                    <td className={styles.matrixCell}>{result.epochs}</td>
                  </tr>
                  <tr>
                    <th className={styles.matrixRowHeader}>Training accuracy</th>
                    <td className={styles.matrixCell}>
                      {accuracy !== null ? `${accuracy.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th className={styles.matrixRowHeader}>Converged</th>
                    <td
                      className={styles.matrixCell}
                      style={{ color: result.converged ? '#22c55e' : '#ef4444' }}
                    >
                      {result.converged ? 'Yes' : 'No (cycling)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {!result.converged && (
              <p className={styles.theoreticalHint} style={{ marginTop: '8px' }}>
                Increase max epochs to allow full convergence.
              </p>
            )}
          </div>

          {result.history.length > 1 && (
            <div className={styles.graphBlock}>
              <h3 className={styles.graphTitle}>Misclassifications per epoch</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={result.history}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="epoch"
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    allowDecimals={false}
                    label={{ value: 'Errors', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(v: number) => [v, 'errors']}
                    labelFormatter={(l) => `Epoch ${l}`}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="2 2" />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    stroke={COLOR_BOUNDARY}
                    strokeWidth={2}
                    dot={result.history.length <= 30}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
