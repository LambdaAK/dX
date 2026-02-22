import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { Path } from '@/types/simulation'
import styles from './PathsPlot.module.css'

const MAX_PATHS_TO_DRAW = 150
const PATH_OPACITY = 0.35

type Props = {
  paths: Path[]
  x0: number
}

export function PathsPlot({ paths, x0: _x0 }: Props) {
  if (paths.length === 0) {
    return (
      <div className={styles.empty}>
        Run a simulation to see paths.
      </div>
    )
  }

  const sample =
    paths.length <= MAX_PATHS_TO_DRAW
      ? paths
      : paths.filter((_, i) => i % Math.ceil(paths.length / MAX_PATHS_TO_DRAW) === 0)

  const path0 = paths[0]
  const data = path0.t.map((t, j) => {
    const row: Record<string, number> = { t }
    sample.forEach((p, i) => {
      row[`p${i}`] = p.x[j]
    })
    return row
  })

  return (
    <div className={styles.wrapper}>
      <p className={styles.hint}>
        Showing {sample.length} of {paths.length} paths
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v) => Number(v).toFixed(2)}
          />
          <YAxis
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v) => Number(v).toFixed(2)}
          />
          <ReferenceLine x={path0.t[0]} stroke="var(--accent)" strokeDasharray="2 2" />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--text)' }}
            formatter={(value: number) => [Number(value).toFixed(4), 'X(t)']}
            labelFormatter={(t) => `t = ${Number(t).toFixed(4)}`}
          />
          {sample.map((_, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`p${i}`}
              stroke="var(--accent)"
              strokeOpacity={PATH_OPACITY}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
