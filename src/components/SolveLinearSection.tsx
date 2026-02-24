import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { solveGeneral, type SolveResult } from '@/lib/linearSolve'
import styles from './MarkovChainSection.module.css'

function tex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v)
  if (Math.abs(v) < 1e-10) return '0'
  const s = v.toPrecision(5)
  return String(parseFloat(s))
}

function parseMatrix(text: string): number[][] | string {
  const lines = text
    .trim()
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return 'Enter at least one row.'
  const rows: number[][] = []
  let cols = -1
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i]
      .split(/[\s,;]+/)
      .map((s) => parseFloat(s))
      .filter((v) => Number.isFinite(v))
    if (parts.length === 0) return `Row ${i + 1}: no numbers found.`
    if (cols >= 0 && parts.length !== cols) return `Row ${i + 1}: expected ${cols} numbers, got ${parts.length}.`
    cols = parts.length
    rows.push(parts)
  }
  return rows
}

function parseVector(text: string, expectedLen: number): number[] | string {
  const parts = text
    .trim()
    .split(/[\s,;]+/)
    .map((s) => parseFloat(s))
    .filter((v) => Number.isFinite(v))
  if (parts.length !== expectedLen) return `Vector b must have exactly ${expectedLen} entries (one per row).`
  return parts
}

const DEFAULT_A = `2  1
1  -1`
const DEFAULT_B = `5
1`

const SVG_SIZE = 400
const PAD = 60

/** Line a*x + b*y = c: two points for drawing. */
function lineSegment(
  a: number,
  b: number,
  c: number,
  extent: number
): [[number, number], [number, number]] {
  const tol = 1e-12
  if (Math.abs(b) > tol) {
    return [
      [-extent, (c + a * extent) / b],
      [extent, (c - a * extent) / b],
    ]
  }
  if (Math.abs(a) > tol) {
    const x0 = c / a
    return [
      [x0, -extent],
      [x0, extent],
    ]
  }
  return [[0, 0], [0, 0]]
}

type VizSolution =
  | { type: 'point'; x: [number, number] }
  | { type: 'line'; particular: [number, number]; direction: [number, number] }
  | { type: 'none' }

function AxEqualsBViz({
  A,
  b,
  solution,
}: {
  A: number[][]
  b: number[]
  solution: VizSolution
}) {
  const n = A[0]?.length ?? 0
  const extent = useMemo(() => {
    let maxAbs = 1.2
    if (solution.type === 'point') {
      maxAbs = Math.max(maxAbs, Math.abs(solution.x[0]), Math.abs(solution.x[1]))
    }
    if (solution.type === 'line') {
      maxAbs = Math.max(
        maxAbs,
        Math.abs(solution.particular[0]),
        Math.abs(solution.particular[1])
      )
    }
    for (let i = 0; i < A.length; i++) {
      const [[x1, y1], [x2, y2]] = lineSegment(A[i][0], A[i][1], b[i], 10)
      maxAbs = Math.max(maxAbs, Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2))
    }
    return maxAbs
  }, [A, b, solution])

  const scale = (SVG_SIZE - 2 * PAD) / (2 * extent)
  const cx = SVG_SIZE / 2
  const cy = SVG_SIZE / 2
  function toSvg(px: number, py: number): [number, number] {
    return [cx + scale * px, cy - scale * py]
  }

  const lineColors = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899']
  const ext = extent + 1

  return (
    <svg
      width="100%"
      height={SVG_SIZE}
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      style={{ maxWidth: 420 }}
    >
      <line x1={0} y1={cy} x2={SVG_SIZE} y2={cy} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 2" />
      <line x1={cx} y1={0} x2={cx} y2={SVG_SIZE} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 2" />
      {A.map((row, i) => {
        const [[x1, y1], [x2, y2]] = lineSegment(row[0], row[1], b[i], ext)
        const [sx1, sy1] = toSvg(x1, y1)
        const [sx2, sy2] = toSvg(x2, y2)
        return (
          <line
            key={i}
            x1={sx1}
            y1={sy1}
            x2={sx2}
            y2={sy2}
            stroke={lineColors[i % lineColors.length]}
            strokeWidth={2}
            opacity={n === 2 ? 1 : 0.7}
          />
        )
      })}
      {solution.type === 'point' && (
        <circle
          cx={toSvg(solution.x[0], solution.x[1])[0]}
          cy={toSvg(solution.x[0], solution.x[1])[1]}
          r={6}
          fill="var(--accent)"
          stroke="var(--text)"
          strokeWidth={1.5}
        />
      )}
      {solution.type === 'line' && (() => {
        const [px, py] = solution.particular
        const [dx, dy] = solution.direction
        const norm = Math.hypot(dx, dy) || 1
        const u = dx / norm
        const v = dy / norm
        const tMax = extent * 1.2
        const p1 = toSvg(px - tMax * u, py - tMax * v)
        const p2 = toSvg(px + tMax * u, py + tMax * v)
        return (
          <>
            <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="var(--accent)" strokeWidth={3} strokeLinecap="round" />
            <circle cx={toSvg(px, py)[0]} cy={toSvg(px, py)[1]} r={5} fill="var(--accent)" stroke="var(--text)" strokeWidth={1} />
          </>
        )
      })()}
    </svg>
  )
}

export function SolveLinearSection() {
  const [matrixText, setMatrixText] = useState(DEFAULT_A)
  const [bText, setBText] = useState(DEFAULT_B)

  const parseA = useMemo(() => {
    const p = parseMatrix(matrixText)
    return typeof p === 'string' ? { matrix: null, error: p } : { matrix: p, error: null }
  }, [matrixText])

  const parseB = useMemo((): { vec: number[]; error: null } | { vec: null; error: string } | null => {
    if (!parseA.matrix) return null
    const p = parseVector(bText, parseA.matrix.length)
    return typeof p === 'string' ? { vec: null, error: p } : { vec: p, error: null }
  }, [bText, parseA.matrix])

  const result = useMemo((): SolveResult | null => {
    if (!parseA.matrix || !parseB?.vec) return null
    return solveGeneral(parseA.matrix, parseB.vec)
  }, [parseA.matrix, parseB])

  const n = parseA.matrix?.[0]?.length ?? 0
  const is2D = n === 2

  const vizSolution: VizSolution = useMemo(() => {
    if (!is2D || !result) return { type: 'none' }
    if (result.kind === 'none') return { type: 'none' }
    if (result.kind === 'unique') return { type: 'point', x: [result.x[0], result.x[1]] }
    if (result.kind === 'infinite' && result.basis.length > 0) {
      const dir = result.basis[0]
      return {
        type: 'line',
        particular: [result.particular[0], result.particular[1]],
        direction: [dir[0], dir[1]],
      }
    }
    return { type: 'none' }
  }, [is2D, result])

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          Solve <span dangerouslySetInnerHTML={{ __html: tex('A\\mathbf{x} = \\mathbf{b}') }} /> for any <span dangerouslySetInnerHTML={{ __html: tex('m \\times n') }} /> matrix <span dangerouslySetInnerHTML={{ __html: tex('A') }} />. The solver uses <strong>reduced row echelon form (RREF)</strong> and reports: <strong>no solution</strong>, a <strong>unique</strong> <span dangerouslySetInnerHTML={{ __html: tex('\\mathbf{x}') }} />, or <strong>infinitely many</strong> (parametric form). When there are 2 variables, the solution set is graphed (point, line, or constraint lines only if inconsistent).
        </p>
      </div>

      <div className={styles.editorBlock}>
        <label className={styles.label}>Matrix A (any m×n; one row per line)</label>
        <textarea
          className={styles.textarea}
          value={matrixText}
          onChange={(e) => setMatrixText(e.target.value)}
          rows={4}
          spellCheck={false}
        />
        <label className={styles.label} style={{ marginTop: '0.75rem' }}>
          Vector b (length m; space or comma separated)
        </label>
        <input
          type="text"
          className={styles.input}
          value={bText}
          onChange={(e) => setBText(e.target.value)}
          style={{ width: '100%', maxWidth: '320px' }}
        />
      </div>

      {parseA.error && <p className={styles.error}>Matrix: {parseA.error}</p>}
      {parseB?.error && !parseA.error && <p className={styles.error}>{parseB.error}</p>}

      {result && result.kind === 'none' && (
        <div className={styles.matrixBlock}>
          <h4 className={styles.matrixTitle}>No solution</h4>
          <p className={styles.matrixHint}>{result.message ?? 'System is inconsistent.'}</p>
        </div>
      )}

      {result && result.kind === 'unique' && (
        <>
          <div className={styles.matrixBlock}>
            <h4 className={styles.matrixTitle}>Unique solution</h4>
            <p className={styles.matrixHint}>
              x = [{result.x.map((v) => fmt(v)).join(', ')}]
            </p>
            <p className={styles.matrixHint}>
              Residual <span dangerouslySetInnerHTML={{ __html: tex('\\|A\\mathbf{x} - \\mathbf{b}\\|_2') }} /> = {result.residual.toExponential(6)}
            </p>
          </div>
        </>
      )}

      {result && result.kind === 'infinite' && (
        <>
          <div className={styles.matrixBlock}>
            <h4 className={styles.matrixTitle}>Infinitely many solutions</h4>
            <p className={styles.matrixHint}>
              Solution set: <span dangerouslySetInnerHTML={{ __html: tex('\\mathbf{x} = \\mathbf{p} + t_1\\mathbf{v}_1 + \\cdots') }} /> (free variables: {result.freeIndices.map((i) => `x${i + 1}`).join(', ')}).
            </p>
            <p className={styles.matrixHint}>
              Particular: p = [{result.particular.map((v) => fmt(v)).join(', ')}]. Residual <span dangerouslySetInnerHTML={{ __html: tex('\\|A\\mathbf{p} - \\mathbf{b}\\|_2') }} /> = {result.residual.toExponential(6)}.
            </p>
            {result.basis.length > 0 && (
              <p className={styles.matrixHint}>
                Direction(s): {result.basis.map((v, i) => `v${i + 1} = (${v.map((a) => fmt(a)).join(', ')})`).join('; ')}.
              </p>
            )}
          </div>
        </>
      )}

      {is2D && parseA.matrix && parseB?.vec && (
        <div className={styles.matrixBlock}>
          <h4 className={styles.matrixTitle}>2D view</h4>
          <p className={styles.matrixHint}>
            Each row of A gives a line <span dangerouslySetInnerHTML={{ __html: tex('A_{i,1}x_1 + A_{i,2}x_2 = b_i') }} />. {result?.kind === 'unique' && 'Dot: unique solution.'}
            {result?.kind === 'infinite' && 'Thick line: solution set (particular + span of direction).'}
            {result?.kind === 'none' && 'No common intersection.'}
          </p>
          <AxEqualsBViz A={parseA.matrix} b={parseB.vec} solution={vizSolution} />
        </div>
      )}
    </div>
  )
}
