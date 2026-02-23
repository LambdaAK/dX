import type { GridWorld, ValueFunction, Policy } from '@/types/mdp'
import styles from './GridWorldView.module.css'

type Props = {
  world: GridWorld
  valueFunction?: ValueFunction
  policy?: Policy
  showValues?: boolean
  showPolicy?: boolean
}

export function GridWorldView({ world, valueFunction, policy, showValues = false, showPolicy = false }: Props) {
  const cellSize = 60
  const arrowSize = 20

  const getValueColor = (value: number): string => {
    // Map value to color (blue = low, red = high)
    const normalized = Math.max(0, Math.min(1, (value + 10) / 20))
    const r = Math.floor(normalized * 255)
    const g = Math.floor((1 - normalized) * 100)
    const b = Math.floor((1 - normalized) * 255)
    return `rgb(${r}, ${g}, ${b})`
  }

  const getArrowPath = (action: string): string => {
    const center = cellSize / 2
    const arrowLen = arrowSize
    const arrowWidth = 8

    switch (action) {
      case 'up':
        return `M ${center} ${center - arrowLen} L ${center - arrowWidth} ${center} L ${center + arrowWidth} ${center} Z`
      case 'down':
        return `M ${center} ${center + arrowLen} L ${center - arrowWidth} ${center} L ${center + arrowWidth} ${center} Z`
      case 'left':
        return `M ${center - arrowLen} ${center} L ${center} ${center - arrowWidth} L ${center} ${center + arrowWidth} Z`
      case 'right':
        return `M ${center + arrowLen} ${center} L ${center} ${center - arrowWidth} L ${center} ${center + arrowWidth} Z`
      default:
        return ''
    }
  }

  return (
    <div className={styles.container}>
      <svg
        width={world.cols * cellSize}
        height={world.rows * cellSize}
        className={styles.svg}
      >
        {/* Draw cells */}
        {Array.from({ length: world.rows }).map((_, r) =>
          Array.from({ length: world.cols }).map((_, c) => {
            const cell = world.grid[r][c]
            const x = c * cellSize
            const y = r * cellSize

            let fill = '#f9fafb'
            let stroke = '#e5e7eb'
            let textColor = '#374151'

            if (cell.type === 'wall') {
              fill = '#374151'
            } else if (cell.type === 'goal') {
              fill = '#22c55e'
              textColor = '#fff'
            } else if (cell.type === 'pit') {
              fill = '#ef4444'
              textColor = '#fff'
            } else if (cell.type === 'empty' && cell.symbol && !valueFunction) {
              // Custom reward cell - color based on reward
              if (cell.reward > 0) {
                fill = '#86efac' // light green
                textColor = '#166534'
              } else if (cell.reward < -1) {
                fill = '#fca5a5' // light red
                textColor = '#991b1b'
              } else {
                fill = '#fde68a' // light yellow
                textColor = '#854d0e'
              }
            } else if (valueFunction && showValues) {
              fill = getValueColor(valueFunction[r][c])
              textColor = '#fff'
            }

            // Highlight start position
            if (r === world.startPos.row && c === world.startPos.col && cell.type === 'empty') {
              stroke = '#3b82f6'
              fill = '#dbeafe'
            }

            return (
              <g key={`${r},${c}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1}
                />

                {/* Cell label */}
                {(cell.type === 'goal' || cell.type === 'pit') && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.cellLabel}
                    fill={textColor}
                    fontSize={24}
                  >
                    {cell.symbol || (cell.type === 'goal' ? 'G' : 'P')}
                  </text>
                )}
                {/* Custom reward cells (non-terminal) */}
                {cell.type === 'empty' && cell.symbol && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.cellLabel}
                    fill={textColor}
                    fontSize={18}
                    fontWeight={600}
                  >
                    {cell.symbol}
                  </text>
                )}

                {/* Start marker */}
                {r === world.startPos.row && c === world.startPos.col && cell.type === 'empty' && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.cellLabel}
                    fill="#3b82f6"
                    fontSize={20}
                  >
                    S
                  </text>
                )}

                {/* Value function */}
                {valueFunction && showValues && cell.type === 'empty' && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.valueText}
                    fill={textColor}
                    fontSize={12}
                  >
                    {valueFunction[r][c].toFixed(1)}
                  </text>
                )}

                {/* Policy arrows */}
                {policy && showPolicy && cell.type === 'empty' && (
                  <path
                    d={getArrowPath(policy[r][c])}
                    transform={`translate(${x}, ${y})`}
                    fill={showValues ? 'rgba(255,255,255,0.8)' : '#3b82f6'}
                    stroke={showValues ? 'rgba(0,0,0,0.3)' : 'none'}
                    strokeWidth={0.5}
                  />
                )}
              </g>
            )
          })
        )}

        {/* Grid lines */}
        {Array.from({ length: world.rows + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * cellSize}
            x2={world.cols * cellSize}
            y2={i * cellSize}
            stroke="#d1d5db"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: world.cols + 1 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * cellSize}
            y1={0}
            x2={i * cellSize}
            y2={world.rows * cellSize}
            stroke="#d1d5db"
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  )
}
