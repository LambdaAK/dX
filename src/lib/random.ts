/**
 * Box-Muller transform: returns a sample from N(0, 1).
 * Uses Math.random() — for reproducibility we could add a seeded RNG later.
 */
export function normal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  if (u1 <= 0) return normal()
  const r = Math.sqrt(-2 * Math.log(u1))
  const theta = 2 * Math.PI * u2
  return r * Math.cos(theta)
}

/**
 * Fill an array with N(0,1) samples (reusable buffer for hot loops).
 */
export function normals(n: number, out?: Float64Array): Float64Array {
  const arr = out ?? new Float64Array(n)
  for (let i = 0; i < n; i++) arr[i] = normal()
  return arr
}
