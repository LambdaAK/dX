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

function subscript(n: number): string {
  return n
    .toString()
    .split('')
    .map((d) => String.fromCharCode(0x2080 + parseInt(d, 10)))
    .join('')
}

type Props = {
  paths: Path[]
  x0: number
  chartRef?: React.RefObject<HTMLDivElement>
}

export function PathsPlot({ paths, x0: _x0, chartRef }: Props) {
  if (paths.length === 0) {
    return (
      <div className={styles.empty} ref={chartRef}>
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
    <div className={styles.wrapper} ref={chartRef}>
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
            formatter={(value: number, name: string) => {
              const i = parseInt(String(name).replace('p', ''), 10)
              const label = isNaN(i) ? 'X(t)' : `X${subscript(i + 1)}(t)`
              return [Number(value).toFixed(4), label]
            }}
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
