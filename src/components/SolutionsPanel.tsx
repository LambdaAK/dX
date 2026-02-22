import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { SimConfig, SimResult, Stats } from '@/types/simulation'
import { getTheoreticalSolution } from '@/lib/solutions'
import styles from './SolutionsPanel.module.css'

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

type Props = {
  processId: string
  params: Record<string, number>
  x0: number
  config: SimConfig
  result: SimResult | null
  stats: Stats | null
}

function SolutionsTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length || payload[0].payload == null) return null
  const row = payload[0].payload as Record<string, number>
  const tooltipStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    color: 'var(--text)',
    fontSize: '0.875rem',
  } as const
  const lines: React.ReactNode[] = [
    <div key="t" style={{ marginBottom: '0.35rem', fontWeight: 600 }}>
      t = {Number(row.t).toFixed(4)}
    </div>,
  ]
  if (row.theoryMean != null) {
    lines.push(<div key="tm">Theory mean: {Number(row.theoryMean).toFixed(4)}</div>)
    lines.push(<div key="tp">Theory mean + 2σ: {Number(row.theoryPlus2).toFixed(4)}</div>)
    lines.push(<div key="tn">Theory mean − 2σ: {Number(row.theoryMinus2).toFixed(4)}</div>)
  }
  if (row.simMean != null) {
    lines.push(<div key="sm">Sim mean: {Number(row.simMean).toFixed(4)}</div>)
  }
  return <div style={tooltipStyle}>{lines}</div>
}

export function SolutionsPanel({
  processId,
  params,
  x0,
  config,
  result,
  stats,
}: Props) {
  const tGrid =
    result?.paths[0]?.t ??
    (() => {
      const { t0, T, dt } = config
      const n = Math.max(1, Math.round((T - t0) / dt))
      const t: number[] = []
      for (let i = 0; i <= n; i++) t.push(t0 + i * dt)
      return t
    })()

  const theory = getTheoreticalSolution(processId, params, x0, tGrid)

  if (!theory) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.noSolution}>
          No closed-form solution available for this process. Run a simulation to
          approximate the distribution numerically.
        </p>
      </div>
    )
  }

  const data = theory.t.map((t, i) => {
    const theoryMean = theory.mean[i]
    const theoryStd = theory.std[i]
    const theoryPlus2 = theoryMean + 2 * theoryStd
    const theoryMinus2 = theoryMean - 2 * theoryStd
    const bandHeight = theoryPlus2 - theoryMinus2
    const row: Record<string, number> = {
      t,
      theoryMean,
      theoryMinus2,
      theoryPlus2,
      bandHeight,
    }
    if (stats && i < stats.mean.length) {
      row.simMean = stats.mean[i]
      row.simPlus2 = stats.mean[i] + 2 * stats.std[i]
      row.simMinus2 = stats.mean[i] - 2 * stats.std[i]
    }
    return row
  })

  return (
    <div className={styles.wrapper}>
      <div className={styles.formula}>
        <div className={styles.formulaTitle}>Analytical solution</div>
        <div
          className={styles.formulaText}
          dangerouslySetInnerHTML={{ __html: renderLatex(theory.formulaLatex, true) }}
        />
        {theory.stationaryLatex && (
          <div
            className={styles.stationary}
            dangerouslySetInnerHTML={{
              __html: renderLatex(theory.stationaryLatex, true),
            }}
          />
        )}
      </div>
      <p className={styles.hint}>
        Theoretical mean and mean ± 2σ
        {stats ? ' vs simulated (dashed)' : ''}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v) => Number(v).toFixed(2)}
            label={{
              value: 'Time (t)',
              position: 'insideBottom',
              offset: -4,
              fill: 'var(--text-muted)',
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v) => Number(v).toFixed(2)}
            label={{
              value: 'X(t)',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--text-muted)',
              fontSize: 12,
            }}
          />
          <Tooltip content={<SolutionsTooltip />} />
          <Area
            type="monotone"
            dataKey="theoryMinus2"
            stackId="theoryBand"
            baseValue={0}
            stroke="none"
            fill="var(--bg)"
          />
          <Area
            type="monotone"
            dataKey="bandHeight"
            stackId="theoryBand"
            stroke="none"
            fill="var(--accent)"
            fillOpacity={0.15}
          />
          <Line
            type="monotone"
            dataKey="theoryMean"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            name="Theory mean"
          />
          {stats && (
            <>
              <Line
                type="monotone"
                dataKey="simMean"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Sim mean"
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
