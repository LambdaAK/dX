import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ProcessDef } from '@/types/process'
import type { SimConfig } from '@/types/simulation'
import { solveFokkerPlanck, suggestDomain } from '@/lib/fokkerPlanck'
import { getDensityFormulaLatex } from '@/lib/solutions'
import styles from './DensityPanel.module.css'

const FOKKER_PLANCK_LATEX =
  '\\frac{\\partial p}{\\partial t} = -\\frac{\\partial}{\\partial x}[f \\cdot p] + \\frac{1}{2}\\frac{\\partial^2}{\\partial x^2}[g^2 \\cdot p]'

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const NX = 160
const MAX_NT = 2500

type Props = {
  process: ProcessDef
  params: Record<string, number>
  x0: number
  config: SimConfig
  chartRef?: React.RefObject<HTMLDivElement>
}

export function DensityPanel({ process, params, x0, config, chartRef }: Props) {
  const { t0, T } = config
  const domain = useMemo(
    () => suggestDomain(process.id, params, x0, T),
    [process.id, params, x0, T]
  )
  const result = useMemo(() => {
    return solveFokkerPlanck({
      process,
      params,
      x0,
      t0,
      T,
      xMin: domain.xMin,
      xMax: domain.xMax,
      nX: NX,
      maxNt: MAX_NT,
    })
  }, [process, params, x0, t0, T, domain.xMin, domain.xMax])

  const [timeIndex, setTimeIndex] = useState(0)
  useEffect(() => {
    setTimeIndex(Math.floor(result.t.length / 2))
  }, [result.t.length])
  const timeIndexClamped = Math.min(timeIndex, Math.max(0, result.t.length - 1))
  const tSlice = result.t[timeIndexClamped]
  const pSlice = result.p[timeIndexClamped]

  const pSmoothed = useMemo(() => {
    const n = pSlice.length
    const out = new Array<number>(n)
    const half = 2
    for (let i = 0; i < n; i++) {
      const lo = Math.max(0, i - half)
      const hi = Math.min(n - 1, i + half)
      let sum = 0
      for (let j = lo; j <= hi; j++) sum += pSlice[j]
      out[i] = sum / (hi - lo + 1)
    }
    return out
  }, [pSlice])

  const sliceData = useMemo(
    () => result.x.map((xi, i) => ({ x: xi, p: pSmoothed[i] })),
    [result.x, pSmoothed]
  )

  const densityFormula = useMemo(() => getDensityFormulaLatex(process.id), [process.id])

  return (
    <div className={styles.wrapper} ref={chartRef}>
      <div className={styles.equationBlock}>
        <span className={styles.equationIntro}>Fokker-Planck equation:</span>
        <div
          className={styles.equationLatex}
          dangerouslySetInnerHTML={{
            __html: renderLatex(FOKKER_PLANCK_LATEX, true),
          }}
        />
      </div>
      {densityFormula && (
        <div className={styles.closedFormBlock}>
          <span className={styles.equationIntro}>Closed-form solution:</span>
          <div
            className={styles.equationLatex}
            dangerouslySetInnerHTML={{
              __html: renderLatex(densityFormula.main, true),
            }}
          />
          {densityFormula.where && (
            <>
              <span className={styles.whereLabel}>where</span>
              <div
                className={styles.equationLatex}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(densityFormula.where, true),
                }}
              />
            </>
          )}
        </div>
      )}
      <div className={styles.sliceSection}>
        <div className={styles.sliceSectionTitle}>p(x, t) vs x</div>
        <label className={styles.sliderLabel}>
          <span className={styles.sliderTime}>t = {tSlice.toFixed(3)}</span>
          <input
            type="range"
            min={0}
            max={result.t.length - 1}
            value={timeIndexClamped}
            onChange={(e) => setTimeIndex(Number(e.target.value))}
            className={styles.slider}
          />
        </label>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={sliceData}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="x"
              type="number"
              domain={['auto', 'auto']}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={(v) => Number(v).toFixed(2)}
              label={{
                value: 'x',
                position: 'insideBottom',
                offset: -4,
                fill: 'var(--text-muted)',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={(v) => Number(v).toFixed(3)}
              label={{
                value: 'p(x, t)',
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
              formatter={(value: number) => [Number(value).toFixed(5), 'p(x, t)']}
              labelFormatter={(x) => `x = ${Number(x).toFixed(4)}`}
            />
            <Line
              type="monotone"
              dataKey="p"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
