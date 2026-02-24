import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ComposedChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  OBJECTIVES_1D,
  runGradientDescent1D,
  sample1D,
  type ObjectiveId,
} from '@/lib/gradientDescent'
import styles from './MarkovChainSection.module.css'

function tex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const SAMPLE_POINTS = 300

export function GradientDescentSection() {
  const [objectiveId, setObjectiveId] = useState<ObjectiveId>('quadratic')
  const [stepSize, setStepSize] = useState(0.1)
  const [momentum, setMomentum] = useState(0)
  const [maxIter, setMaxIter] = useState(50)
  const [x0, setX0] = useState(1.5)

  const obj = OBJECTIVES_1D[objectiveId]

  const result = useMemo(
    () => runGradientDescent1D(obj, x0, stepSize, momentum, maxIter),
    [objectiveId, x0, stepSize, momentum, maxIter]
  )

  const pathData = useMemo(
    () =>
      result.path.map((x, i) => ({
        x,
        y: obj.f(x),
        iter: i,
      })),
    [result.path, objectiveId]
  )

  const { xDomain, divergedFromView } = useMemo(() => {
    const [baseMin, baseMax] = obj.view
    let minX = baseMin
    let maxX = baseMax

    const pathXs = pathData.map((d) => d.x).filter(Number.isFinite)
    if (pathXs.length > 0) {
      minX = Math.min(minX, ...pathXs)
      maxX = Math.max(maxX, ...pathXs)
    }

    let span = maxX - minX || 1
    const baseSpan = baseMax - baseMin || 1
    let diverged = false

    // If the path wanders far outside the natural view, treat it as "diverged"
    // and keep the domain close to the original objective view so the curve
    // shape stays readable.
    if (span > baseSpan * 3) {
      minX = baseMin
      maxX = baseMax
      span = baseSpan
      diverged = true
    }

    const pad = 0.1 * span
    return {
      xDomain: [minX - pad, maxX + pad] as [number, number],
      divergedFromView: diverged,
    }
  }, [objectiveId, pathData])

  const curveData = useMemo(
    () => sample1D(obj, SAMPLE_POINTS, xDomain),
    [objectiveId, xDomain]
  )

  const lossChartData = useMemo(
    () => result.losses.map((loss, i) => ({ iter: i, loss })),
    [result.losses]
  )

  // Y-domain: prefer the hand-tuned yView for each objective so the curve shape
  // is always readable; fall back to sampling if not provided.
  const yDomain = useMemo<[number, number]>(() => {
    if (obj.yView) return obj.yView
    const ys = curveData.map((d) => d.y).filter(Number.isFinite)
    if (ys.length === 0) return [0, 1]
    const lo = Math.min(...ys)
    const hi = Math.max(...ys)
    const pad = (hi - lo) * 0.15 || 0.5
    return [lo - pad, hi + pad]
  }, [obj, curveData])

  // Only show iterates whose f(x) values are in (or close to) the visible y-range,
  // so points appear on the curve instead of being clipped at the very top.
  const pathDisplayData = useMemo(() => {
    const [lo, hi] = yDomain
    const margin = (hi - lo) * 0.2 || 1
    return pathData.filter((p) => p.y >= lo - margin && p.y <= hi + margin)
  }, [pathData, yDomain])

  const formula =
    objectiveId === 'quadratic'
      ? 'f(x) = x^2'
      : objectiveId === 'quartic'
        ? 'f(x) = x^4 - 2x^2'
        : 'f(x) = x^2 + \\sin(5x)'

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          Visualize <strong>gradient descent</strong> on a <strong>1D function</strong> <span dangerouslySetInnerHTML={{ __html: tex('f(x)') }} />. Choose an objective, set step size (η), optional momentum (β), and initial <span dangerouslySetInnerHTML={{ __html: tex('x_0') }} />. The graph shows <span dangerouslySetInnerHTML={{ __html: tex('f(x)') }} /> and the path traced by gradient descent. Large step sizes can cause divergence or oscillation.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <label className={styles.label}>Objective</label>
        <select
          className={styles.select}
          value={objectiveId}
          onChange={(e) => setObjectiveId(e.target.value as ObjectiveId)}
        >
          <option value="quadratic">Quadratic (min at 0)</option>
          <option value="quartic">Quartic (two local minima at ±1)</option>
          <option value="sine">Sinusoidal (many local minima)</option>
        </select>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <label className={styles.label} style={{ marginRight: '0.5rem' }}>
            Step size (η)
          </label>
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={stepSize}
            onChange={(e) => setStepSize(Number(e.target.value))}
          />
          <span className={styles.matrixHint}>{stepSize.toFixed(2)}</span>
          <label className={styles.label} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }}>
            Momentum (β)
          </label>
          <input
            type="range"
            min={0}
            max={0.95}
            step={0.05}
            value={momentum}
            onChange={(e) => setMomentum(Number(e.target.value))}
          />
          <span className={styles.matrixHint}>{momentum.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
          <label className={styles.label}>Max iterations</label>
          <input
            type="number"
            min={5}
            max={200}
            value={maxIter}
            onChange={(e) => setMaxIter(Math.max(5, Math.min(200, Number(e.target.value) || 50)))}
            className={styles.input}
            style={{ width: 80 }}
          />
          <label className={styles.label}>Initial x₀</label>
          <input
            type="number"
            step={0.1}
            value={x0}
            onChange={(e) => setX0(Number(e.target.value))}
            className={styles.input}
            style={{ width: 88 }}
          />
        </div>
      </div>

      <div className={styles.matrixBlock}>
        <h4 className={styles.matrixTitle}>f(x) and gradient descent path</h4>
        <p className={styles.matrixHint}>
          <span dangerouslySetInnerHTML={{ __html: tex(formula) }} />. Solid line = f(x); dashed line = gradient descent trajectory.
        </p>
        <p className={styles.matrixHint}>
          Gradient descent update:&nbsp;
          <span
            dangerouslySetInnerHTML={{
              __html: tex("x_{k+1} = x_k - \\eta \\, f'(x_k)"),
            }}
          />
          . With momentum&nbsp;
          <span dangerouslySetInnerHTML={{ __html: tex('\\beta') }} />
          :&nbsp;
          <span
            dangerouslySetInnerHTML={{
              __html: tex('v_{k+1} = \\beta v_k + f\'(x_k),\\\\\\; x_{k+1} = x_k - \\eta v_{k+1}'),
            }}
          />
          .
        </p>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={curveData}
              margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" type="number" domain={xDomain} tick={{ fontSize: 11 }} />
              <YAxis type="number" domain={yDomain} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [value.toFixed(4), 'f(x)']}
                labelFormatter={(label) => `x = ${Number(label).toFixed(4)}`}
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="var(--text-muted)"
                strokeWidth={2}
                dot={false}
                name="f(x)"
              />
              {/* Trajectory: path points connected in order so descent along f(x) is visible */}
              <Line
                data={pathDisplayData}
                type="monotone"
                dataKey="y"
                stroke="#f97316"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
                name="Trajectory"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className={styles.matrixHint}>
          Final x = {result.path[result.path.length - 1]?.toFixed(6) ?? '—'}, f(x) ={' '}
          {result.losses[result.losses.length - 1]?.toExponential(6) ?? '—'}
          {divergedFromView && ' (path left the main view; try a smaller step size or closer x₀).'}
        </p>
      </div>

      <div className={styles.matrixBlock}>
        <h4 className={styles.matrixTitle}>Loss vs iteration</h4>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lossChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="iter" type="number" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} scale="log" domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => [typeof v === 'number' ? v.toExponential(4) : v, 'Loss']} labelFormatter={(l) => `Iter ${l}`} />
              <Line type="monotone" dataKey="loss" stroke="var(--accent)" strokeWidth={2} dot={false} name="Loss" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
