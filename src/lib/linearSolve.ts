/**
 * General solver for Ax = b via reduced row echelon form (RREF).
 * Handles any m×n system: no solution, unique solution, or infinitely many (parametric).
 */

const EPS = 1e-10

export type SolveResult =
  | { kind: 'none'; message?: string }
  | { kind: 'unique'; x: number[]; residual: number }
  | {
      kind: 'infinite'
      particular: number[]
      /** Indices of free variables (0-based). */
      freeIndices: number[]
      /** Basis for null space: basis[i] corresponds to freeIndices[i]. Solution = particular + sum t_i * basis[i]. */
      basis: number[][]
      /** Residual ‖A·particular − b‖ (one valid solution). */
      residual: number
    }

/**
 * Solve Ax = b using RREF on [A|b]. Returns no solution, unique x, or parametric form.
 */
export function solveGeneral(A: number[][], b: number[]): SolveResult {
  const m = A.length
  const n = A[0]?.length ?? 0
  if (m === 0 || n === 0) return { kind: 'none', message: 'Empty matrix.' }
  if (b.length !== m) return { kind: 'none', message: 'Length of b must equal number of rows.' }

  // Augmented matrix [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]])
  const numCols = n + 1

  // ─── RREF with partial pivoting ─────────────────────────────────────────
  let pivotRow = 0
  const pivotCols: number[] = [] // pivotCols[r] = column index of pivot in row r

  for (let col = 0; col < n && pivotRow < m; col++) {
    let best = pivotRow
    let bestVal = Math.abs(M[pivotRow][col])
    for (let row = pivotRow + 1; row < m; row++) {
      const v = Math.abs(M[row][col])
      if (v > bestVal) {
        bestVal = v
        best = row
      }
    }
    if (bestVal < EPS) continue // no pivot in this column
    ;[M[pivotRow], M[best]] = [M[best], M[pivotRow]]
    const pivot = M[pivotRow][col]
    for (let j = 0; j < numCols; j++) M[pivotRow][j] /= pivot
    for (let row = 0; row < m; row++) {
      if (row === pivotRow) continue
      const fac = M[row][col]
      if (Math.abs(fac) < EPS) continue
      for (let j = 0; j < numCols; j++) M[row][j] -= fac * M[pivotRow][j]
    }
    pivotCols.push(col)
    pivotRow++
  }

  // ─── Check inconsistency: row [0 ... 0 | c] with c ≠ 0 ───────────────────
  for (let row = 0; row < m; row++) {
    let allZero = true
    for (let j = 0; j < n; j++) if (Math.abs(M[row][j]) > EPS) allZero = false
    if (allZero && Math.abs(M[row][n]) > EPS) return { kind: 'none', message: 'No solution (inconsistent system).' }
  }

  const pivotSet = new Set(pivotCols)
  const freeIndices: number[] = []
  for (let j = 0; j < n; j++) if (!pivotSet.has(j)) freeIndices.push(j)

  if (freeIndices.length === 0) {
    // Unique solution: read off from RHS
    const x = new Array(n).fill(0)
    for (let r = 0; r < pivotCols.length; r++) x[pivotCols[r]] = M[r][n]
    const res = residual(A, x, b)
    return { kind: 'unique', x, residual: res }
  }

  // Infinitely many: particular + null-space basis
  // Particular: set free vars = 0, then pivot vars = RHS in pivot rows
  const particular = new Array(n).fill(0)
  for (let r = 0; r < pivotCols.length; r++) particular[pivotCols[r]] = M[r][n]

  // Basis: for each free index j, vector v with v[j]=1 and v[pivotCol] = -M[r][j] for pivot row r
  const basis: number[][] = freeIndices.map((freeCol) => {
    const v = new Array(n).fill(0)
    v[freeCol] = 1
    for (let r = 0; r < pivotCols.length; r++) v[pivotCols[r]] = -M[r][freeCol]
    return v
  })

  const res = residual(A, particular, b)
  return { kind: 'infinite', particular, freeIndices, basis, residual: res }
}

function residual(A: number[][], x: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < A.length; i++) {
    let Ax_i = 0
    for (let j = 0; j < x.length; j++) Ax_i += A[i][j] * x[j]
    sum += (Ax_i - b[i]) ** 2
  }
  return Math.sqrt(sum)
}
