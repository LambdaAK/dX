import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { determinant, inverse } from '@/lib/matrixFactorizations'
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

/** Matrix product C = A * B (A m×p, B p×n). */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length
  const p = A[0]?.length ?? 0
  const n = B[0]?.length ?? 0
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0))
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++) C[i][j] += A[i][k] * B[k][j]
  return C
}

/** Frobenius norm of A − I (I = identity). */
function errorFromIdentity(A: number[][]): number {
  let sum = 0
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < (A[0]?.length ?? 0); j++) {
      const v = A[i][j] - (i === j ? 1 : 0)
      sum += v * v
    }
  return Math.sqrt(sum)
}

const DEFAULT_MATRIX = `2  1
1  -1`

export function MatrixInverseSection() {
  const [matrixText, setMatrixText] = useState(DEFAULT_MATRIX)

  const parseResult = useMemo(() => {
    const p = parseMatrix(matrixText)
    return typeof p === 'string' ? { matrix: null, error: p } : { matrix: p, error: null }
  }, [matrixText])

  const result = useMemo((): {
    det: number
    inv: number[][] | null
    error: string | null
    verifyError?: number
  } | null => {
    if (!parseResult.matrix) return null
    const A = parseResult.matrix
    if (A.length !== (A[0]?.length ?? 0)) return { det: NaN, inv: null, error: 'Matrix must be square.' }
    const det = determinant(A)
    const inv = inverse(A)
    if (inv === null) return { det, inv: null, error: 'Matrix is singular (det = 0 or numerically singular).' }
    const err = errorFromIdentity(matMul(A, inv))
    return { det, inv, error: null, verifyError: err }
  }, [parseResult.matrix])

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          For a <strong>square matrix A</strong>, compute <span dangerouslySetInnerHTML={{ __html: tex('\\det(A)') }} /> and <span dangerouslySetInnerHTML={{ __html: tex('A^{-1}') }} /> (when it exists). The inverse is computed via <strong>LU factorization</strong> (solving <span dangerouslySetInnerHTML={{ __html: tex('A\\mathbf{x} = \\mathbf{e}_j') }} /> for each column of the identity). Verification: <span dangerouslySetInnerHTML={{ __html: tex('\\|A A^{-1} - I\\|_F') }} />.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <label className={styles.label}>Matrix A (square; one row per line)</label>
        <textarea
          className={styles.textarea}
          value={matrixText}
          onChange={(e) => setMatrixText(e.target.value)}
          rows={4}
          spellCheck={false}
        />
      </div>

      {parseResult.error && <p className={styles.error}>Matrix: {parseResult.error}</p>}
      {result?.error && !parseResult.error && result.inv === null && (
        <p className={styles.error}>{result.error}</p>
      )}

      {result && !parseResult.error && (
        <>
          <div className={styles.matrixBlock}>
            <h4 className={styles.matrixTitle}>Determinant</h4>
            <p className={styles.matrixHint}>
              <span dangerouslySetInnerHTML={{ __html: tex('\\det(A)') }} /> = {fmt(result.det)}
            </p>
          </div>
          {result.inv !== null && result.inv !== undefined && result.verifyError !== undefined && (
            <>
              <div className={styles.matrixBlock}>
                <h4 className={styles.matrixTitle}>Inverse A⁻¹</h4>
                <div className={styles.matrixWrap}>
                  <table className={styles.matrixTable}>
                    <tbody>
                      {result.inv.map((row, i) => (
                        <tr key={i}>
                          {row.map((v, j) => (
                            <td key={j} className={styles.matrixCell}>
                              {fmt(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={styles.matrixHint}>
                  Verification <span dangerouslySetInnerHTML={{ __html: tex('\\|A A^{-1} - I\\|_F') }} /> = {result.verifyError.toExponential(6)}
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
