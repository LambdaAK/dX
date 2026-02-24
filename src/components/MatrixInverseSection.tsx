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

/** Matrix transpose (m×n → n×m). */
function transpose(M: number[][]): number[][] {
  const m = M.length
  const n = M[0]?.length ?? 0
  const T: number[][] = Array.from({ length: n }, () => new Array(m).fill(0))
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) T[j][i] = M[i][j]
  return T
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

/** Frobenius norm of (A − I) for square A. */
function errorFromIdentity(A: number[][]): number {
  let sum = 0
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < (A[0]?.length ?? 0); j++) {
      const v = A[i][j] - (i === j ? 1 : 0)
      sum += v * v
    }
  return Math.sqrt(sum)
}

/**
 * Left inverse L (n×m): L·A = I_n. Exists iff A has full column rank (rank = n).
 * Formula: L = (AᵀA)⁻¹Aᵀ when AᵀA is invertible.
 */
function leftInverse(A: number[][]): number[][] | null {
  const m = A.length
  const n = A[0]?.length ?? 0
  if (m < n) return null
  const At = transpose(A)
  const AtA = matMul(At, A)
  const invAtA = inverse(AtA)
  if (invAtA === null) return null
  return matMul(invAtA, At)
}

/**
 * Right inverse R (n×m): A·R = I_m. Exists iff A has full row rank (rank = m).
 * Formula: R = Aᵀ(A·Aᵀ)⁻¹ when A·Aᵀ is invertible.
 */
function rightInverse(A: number[][]): number[][] | null {
  const m = A.length
  const n = A[0]?.length ?? 0
  if (n < m) return null
  const At = transpose(A)
  const AAt = matMul(A, At)
  const invAAt = inverse(AAt)
  if (invAAt === null) return null
  return matMul(At, invAAt)
}

const DEFAULT_MATRIX = `2  1
1  -1`

type InvertibilityKind = 'none' | 'left-only' | 'right-only' | 'both'

export function MatrixInverseSection() {
  const [matrixText, setMatrixText] = useState(DEFAULT_MATRIX)

  const parseResult = useMemo(() => {
    const p = parseMatrix(matrixText)
    return typeof p === 'string' ? { matrix: null, error: p } : { matrix: p, error: null }
  }, [matrixText])

  const result = useMemo((): {
    m: number
    n: number
    kind: InvertibilityKind
    det: number | null
    twoSided: number[][] | null
    leftInv: number[][] | null
    rightInv: number[][] | null
    verifyLeft?: number
    verifyRight?: number
    verifyTwoSided?: number
  } | null => {
    if (!parseResult.matrix) return null
    const A = parseResult.matrix
    const m = A.length
    const n = A[0]?.length ?? 0

    const leftInv = leftInverse(A)
    const rightInv = rightInverse(A)
    const square = m === n
    const twoSided = square ? inverse(A) : null

    let kind: InvertibilityKind = 'none'
    if (leftInv !== null && rightInv !== null) kind = 'both'
    else if (leftInv !== null) kind = 'left-only'
    else if (rightInv !== null) kind = 'right-only'

    const verifyLeft = leftInv !== null ? errorFromIdentity(matMul(leftInv, A)) : undefined
    const verifyRight = rightInv !== null ? errorFromIdentity(matMul(A, rightInv)) : undefined
    const verifyTwoSided = twoSided !== null ? errorFromIdentity(matMul(A, twoSided)) : undefined

    return {
      m,
      n,
      kind,
      det: square ? determinant(A) : null,
      twoSided,
      leftInv,
      rightInv,
      verifyLeft,
      verifyRight,
      verifyTwoSided,
    }
  }, [parseResult.matrix])

  function renderMatrixTable(M: number[][]) {
    return (
      <div className={styles.matrixWrap}>
        <table className={styles.matrixTable}>
          <tbody>
            {M.map((row, i) => (
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
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          For any <strong>m×n matrix A</strong>, the solver computes <strong>left</strong> and/or <strong>right</strong> inverses when they exist. A <strong>left inverse</strong> <span dangerouslySetInnerHTML={{ __html: tex('L') }} /> (n×m) satisfies <span dangerouslySetInnerHTML={{ __html: tex('L A = I_n') }} /> — it exists iff <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> has <strong>full column rank</strong> (columns linearly independent), i.e. <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> is <strong>injective</strong> (one-to-one). A <strong>right inverse</strong> <span dangerouslySetInnerHTML={{ __html: tex('R') }} /> (n×m) satisfies <span dangerouslySetInnerHTML={{ __html: tex('A R = I_m') }} /> — it exists iff <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> has <strong>full row rank</strong>, i.e. <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> is <strong>surjective</strong> (onto). When both exist, <span dangerouslySetInnerHTML={{ __html: tex('m = n') }} /> and <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> is <strong>bijective</strong> (invertible); then <span dangerouslySetInnerHTML={{ __html: tex('L = R = A^{-1}') }} />.
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
      </div>

      {parseResult.error && <p className={styles.error}>Matrix: {parseResult.error}</p>}

      {result && !parseResult.error && (
        <>
          <div className={styles.matrixBlock}>
            <h4 className={styles.matrixTitle}>Shape and invertibility</h4>
            <p className={styles.matrixHint}>
              A is <span dangerouslySetInnerHTML={{ __html: tex(`${result.m} \\times ${result.n}`) }} />.
              {result.kind === 'none' && ' Not left or right invertible (lacks full column rank and full row rank).'}
              {result.kind === 'left-only' && ' Left invertible only: full column rank (injective). No right inverse (not surjective).'}
              {result.kind === 'right-only' && ' Right invertible only: full row rank (surjective). No left inverse (not injective).'}
              {result.kind === 'both' && ' Both left and right invertible ⇒ square and invertible (bijective). L = R = A⁻¹.'}
            </p>
            {result.det !== null && (
              <p className={styles.matrixHint}>
                <span dangerouslySetInnerHTML={{ __html: tex('\\det(A)') }} /> = {fmt(result.det)}.
              </p>
            )}
          </div>

          {result.twoSided !== null && result.verifyTwoSided !== undefined && (
            <div className={styles.matrixBlock}>
              <h4 className={styles.matrixTitle}>Two-sided inverse A⁻¹</h4>
              <p className={styles.matrixHint}>
                <span dangerouslySetInnerHTML={{ __html: tex('A A^{-1} = A^{-1} A = I') }} />.
              </p>
              <p className={styles.matrixHint}>
                <strong>How it’s computed:</strong> LU factorization of <span dangerouslySetInnerHTML={{ __html: tex('A') }} />; then solve <span dangerouslySetInnerHTML={{ __html: tex('A\\mathbf{x} = \\mathbf{e}_j') }} /> for each column <span dangerouslySetInnerHTML={{ __html: tex('\\mathbf{e}_j') }} /> of the identity. The solution vectors are the columns of <span dangerouslySetInnerHTML={{ __html: tex('A^{-1}') }} />.
              </p>
              {renderMatrixTable(result.twoSided)}
              <p className={styles.matrixHint}>
                Verification <span dangerouslySetInnerHTML={{ __html: tex('\\|A A^{-1} - I\\|_F') }} /> = {result.verifyTwoSided.toExponential(6)}.
              </p>
            </div>
          )}

          {result.kind === 'left-only' && result.leftInv !== null && result.verifyLeft !== undefined && (
            <div className={styles.matrixBlock}>
              <h4 className={styles.matrixTitle}>Left inverse L (n×m)</h4>
              <p className={styles.matrixHint}>
                <span dangerouslySetInnerHTML={{ __html: tex('L A = I_n') }} />. Formula: <span dangerouslySetInnerHTML={{ __html: tex('L = (A^\\top A)^{-1} A^\\top') }} />.
              </p>
              <p className={styles.matrixHint}>
                <strong>How it’s computed:</strong> Form the <span dangerouslySetInnerHTML={{ __html: tex('n \\times n') }} /> matrix <span dangerouslySetInnerHTML={{ __html: tex('A^\\top A') }} /> (full column rank of <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> makes it invertible). Invert it via LU, then <span dangerouslySetInnerHTML={{ __html: tex('L = (A^\\top A)^{-1} A^\\top') }} />.
              </p>
              {renderMatrixTable(result.leftInv)}
              <p className={styles.matrixHint}>
                Verification <span dangerouslySetInnerHTML={{ __html: tex('\\|L A - I_n\\|_F') }} /> = {result.verifyLeft.toExponential(6)}.
              </p>
            </div>
          )}

          {result.kind === 'right-only' && result.rightInv !== null && result.verifyRight !== undefined && (
            <div className={styles.matrixBlock}>
              <h4 className={styles.matrixTitle}>Right inverse R (n×m)</h4>
              <p className={styles.matrixHint}>
                <span dangerouslySetInnerHTML={{ __html: tex('A R = I_m') }} />. Formula: <span dangerouslySetInnerHTML={{ __html: tex('R = A^\\top (A A^\\top)^{-1}') }} />.
              </p>
              <p className={styles.matrixHint}>
                <strong>How it’s computed:</strong> Form the <span dangerouslySetInnerHTML={{ __html: tex('m \\times m') }} /> matrix <span dangerouslySetInnerHTML={{ __html: tex('A A^\\top') }} /> (full row rank of <span dangerouslySetInnerHTML={{ __html: tex('A') }} /> makes it invertible). Invert it via LU, then <span dangerouslySetInnerHTML={{ __html: tex('R = A^\\top (A A^\\top)^{-1}') }} />.
              </p>
              {renderMatrixTable(result.rightInv)}
              <p className={styles.matrixHint}>
                Verification <span dangerouslySetInnerHTML={{ __html: tex('\\|A R - I_m\\|_F') }} /> = {result.verifyRight.toExponential(6)}.
              </p>
            </div>
          )}

        </>
      )}
    </div>
  )
}
