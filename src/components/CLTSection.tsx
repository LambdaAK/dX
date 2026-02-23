import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { runCLTSimulation, buildHistogramData, theoreticalVariance } from '@/lib/clt'
import { theoreticalMean } from '@/lib/lln'
import { createSeededRng } from '@/lib/random'
import type { LLNDistribution } from '@/types/lln'
import type { CLTConfig, CLTResult } from '@/lib/clt'
import styles from './MarkovChainSection.module.css'

function renderLatex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const DISTRIBUTION_OPTIONS: { id: LLNDistribution['type']; label: string }[] = [
  { id: 'bernoulli', label: 'Bernoulli(p)' },
  { id: 'gaussian', label: 'Gaussian(μ, σ)' },
  { id: 'uniform', label: 'Uniform(a, b)' },
  { id: 'exponential', label: 'Exponential(λ)' },
  { id: 'poisson', label: 'Poisson(λ)' },
  { id: 'beta', label: 'Beta(α, β)' },
]

function getDefaultDistribution(type: LLNDistribution['type']): LLNDistribution {
  switch (type) {
    case 'bernoulli':
      return { type: 'bernoulli', p: 0.5 }
    case 'gaussian':
      return { type: 'gaussian', mean: 0, std: 1 }
    case 'uniform':
      return { type: 'uniform', min: 0, max: 1 }
    case 'exponential':
      return { type: 'exponential', lambda: 1 }
    case 'poisson':
      return { type: 'poisson', lambda: 3 }
    case 'beta':
      return { type: 'beta', alpha: 2, beta: 5 }
    default:
      return { type: 'bernoulli', p: 0.5 }
  }
}

export function CLTSection() {
  const [distType, setDistType] = useState<LLNDistribution['type']>('bernoulli')
  const [distribution, setDistribution] = useState<LLNDistribution>(() =>
    getDefaultDistribution('bernoulli')
  )
  const [sampleSize, setSampleSize] = useState(30)
  const [numTrials, setNumTrials] = useState(5000)
  const [seed, setSeed] = useState('')
  const [result, setResult] = useState<CLTResult | null>(null)
  const [running, setRunning] = useState(false)

  const handleDistTypeChange = (type: LLNDistribution['type']) => {
    setDistType(type)
    setDistribution(getDefaultDistribution(type))
  }

  const config: CLTConfig = useMemo(
    () => ({ distribution, sampleSize, numTrials }),
    [distribution, sampleSize, numTrials]
  )

  const handleRun = () => {
    setRunning(true)
    setResult(null)
    const rand =
      seed.trim() !== '' && !Number.isNaN(Number(seed))
        ? createSeededRng(Number(seed))
        : Math.random
    setTimeout(() => {
      const res = runCLTSimulation(config, rand)
      setResult(res)
      setRunning(false)
    }, 0)
  }

  const chartData = useMemo(() => {
    if (!result) return []
    return buildHistogramData(result, config, 50)
  }, [result, distribution, sampleSize, numTrials])

  const mu = theoreticalMean(distribution)
  const sigmaSq = theoreticalVariance(distribution)
  const meanVariance = sampleSize > 0 ? sigmaSq / sampleSize : 0

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          The <strong>central limit theorem (CLT)</strong> says that the sample mean of i.i.d. draws (with finite variance) is approximately normal. For <span dangerouslySetInnerHTML={{ __html: renderLatex('X_1, \\ldots, X_n') }} /> i.i.d. with <span dangerouslySetInnerHTML={{ __html: renderLatex('\\mathbb{E}[X_i] = \\mu') }} /> and <span dangerouslySetInnerHTML={{ __html: renderLatex('\\mathrm{Var}(X_i) = \\sigma^2') }} />, the sample mean <span dangerouslySetInnerHTML={{ __html: renderLatex('\\bar{X}_n = \\frac{1}{n}\\sum_{i=1}^n X_i') }} /> satisfies
        </p>
        <p className={styles.introFormula} dangerouslySetInnerHTML={{ __html: renderLatex('\\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\,\\xrightarrow{d}\\, \\mathcal{N}(0, 1) \\quad \\text{as } n \\to \\infty', true) }} />
        <p className={styles.introText}>
          So the distribution of <span dangerouslySetInnerHTML={{ __html: renderLatex('\\bar{X}_n') }} /> is approximately <span dangerouslySetInnerHTML={{ __html: renderLatex('\\mathcal{N}(\\mu, \\sigma^2/n)') }} />. Choose a distribution, set sample size <span dangerouslySetInnerHTML={{ __html: renderLatex('n') }} /> and number of trials <span dangerouslySetInnerHTML={{ __html: renderLatex('M') }} />; each trial computes one sample mean. The histogram of the <span dangerouslySetInnerHTML={{ __html: renderLatex('M') }} /> means should match the normal curve.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Distribution</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Type</span>
            <select
              className={styles.input}
              value={distType}
              onChange={(e) => handleDistTypeChange(e.target.value as LLNDistribution['type'])}
            >
              {DISTRIBUTION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {distribution.type === 'bernoulli' && (
            <label className={styles.fieldLabel}>
              <span>p</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={distribution.p}
                onChange={(e) =>
                  setDistribution({ ...distribution, p: Number(e.target.value) || 0 })
                }
                className={styles.input}
              />
            </label>
          )}
          {distribution.type === 'gaussian' && (
            <>
              <label className={styles.fieldLabel}>
                <span>μ</span>
                <input
                  type="number"
                  value={distribution.mean}
                  onChange={(e) =>
                    setDistribution({ ...distribution, mean: Number(e.target.value) || 0 })
                  }
                  className={styles.input}
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>σ</span>
                <input
                  type="number"
                  min={0.01}
                  value={distribution.std}
                  onChange={(e) =>
                    setDistribution({ ...distribution, std: Number(e.target.value) || 0.01 })
                  }
                  className={styles.input}
                />
              </label>
            </>
          )}
          {distribution.type === 'uniform' && (
            <>
              <label className={styles.fieldLabel}>
                <span>a (min)</span>
                <input
                  type="number"
                  value={distribution.min}
                  onChange={(e) =>
                    setDistribution({ ...distribution, min: Number(e.target.value) || 0 })
                  }
                  className={styles.input}
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>b (max)</span>
                <input
                  type="number"
                  value={distribution.max}
                  onChange={(e) =>
                    setDistribution({ ...distribution, max: Number(e.target.value) || 1 })
                  }
                  className={styles.input}
                />
              </label>
            </>
          )}
          {distribution.type === 'exponential' && (
            <label className={styles.fieldLabel}>
              <span>λ</span>
              <input
                type="number"
                min={0.01}
                value={distribution.lambda}
                onChange={(e) =>
                  setDistribution({ ...distribution, lambda: Number(e.target.value) || 0.01 })
                }
                className={styles.input}
              />
            </label>
          )}
          {distribution.type === 'poisson' && (
            <label className={styles.fieldLabel}>
              <span>λ</span>
              <input
                type="number"
                min={0.01}
                value={distribution.lambda}
                onChange={(e) =>
                  setDistribution({ ...distribution, lambda: Number(e.target.value) || 0.01 })
                }
                className={styles.input}
              />
            </label>
          )}
          {distribution.type === 'beta' && (
            <>
              <label className={styles.fieldLabel}>
                <span>α</span>
                <input
                  type="number"
                  min={1}
                  value={distribution.alpha}
                  onChange={(e) =>
                    setDistribution({
                      ...distribution,
                      alpha: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className={styles.input}
                />
              </label>
              <label className={styles.fieldLabel}>
                <span>β</span>
                <input
                  type="number"
                  min={1}
                  value={distribution.beta}
                  onChange={(e) =>
                    setDistribution({
                      ...distribution,
                      beta: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className={styles.input}
                />
              </label>
            </>
          )}
        </div>
        <p className={styles.theoreticalHint}>
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\mu') }} /> = {mu.toFixed(4)},{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\sigma^2') }} /> = {sigmaSq.toFixed(4)},{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\sigma^2/n') }} /> = {meanVariance.toFixed(4)}
        </p>
        <h3 className={styles.optionsTitle} style={{ marginTop: '1rem' }}>
          Simulation
        </h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Sample size n (per mean)</span>
            <input
              type="number"
              min={2}
              max={500}
              value={sampleSize}
              onChange={(e) => setSampleSize(Math.max(2, Number(e.target.value) || 2))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Number of trials M</span>
            <input
              type="number"
              min={100}
              max={50000}
              value={numTrials}
              onChange={(e) => setNumTrials(Math.max(100, Number(e.target.value) || 100))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Seed (optional)</span>
            <input
              type="text"
              placeholder="Leave empty for random"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className={styles.input}
            />
          </label>
          <button
            type="button"
            className={styles.runBtn}
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'Running…' : 'Run simulation'}
          </button>
        </div>
      </div>

      {result && chartData.length > 0 && (
        <div className={styles.graphBlock}>
          <h3 className={styles.graphTitle}>Distribution of sample means</h3>
          <p className={styles.matrixHint}>
            Histogram of <span dangerouslySetInnerHTML={{ __html: renderLatex('M') }} /> sample means (each mean of <span dangerouslySetInnerHTML={{ __html: renderLatex('n') }} /> draws). Curve: <span dangerouslySetInnerHTML={{ __html: renderLatex('\\mathcal{N}(\\mu, \\sigma^2/n)') }} />.
          </p>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="binCenter"
                type="number"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => Number(v).toFixed(2)}
                label={{
                  value: 'Sample mean',
                  position: 'insideBottom',
                  offset: -4,
                  fill: 'var(--text-muted)',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                label={{
                  value: 'Count',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--text-muted)',
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [Number(value).toFixed(0), name]}
                labelFormatter={(x) => `Mean ≈ ${Number(x).toFixed(3)}`}
              />
              <Legend />
              <Bar dataKey="count" name="Count" fill="var(--accent)" opacity={0.7} radius={[2, 2, 0, 0]} />
              <Line
                type="monotone"
                dataKey="normalDensity"
                name="N(μ, σ²/n)"
                stroke="var(--text-muted)"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
