/** Uniform (0, 1] from a seed. xorshift32 — good mixing, no consecutive correlation. */
export function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    const u = (s >>> 0) / 4294967296
    return u === 0 ? 1 - 1 / 4294967296 : u
  }
}

/**
 * Box-Muller transform: returns a sample from N(0, 1).
 * If rand is provided (e.g. from createSeededRng), uses it for reproducibility.
 */
export function normal(rand?: () => number): number {
  const r = rand ?? Math.random
  let u1 = r()
  let u2 = r()
  while (u1 <= 0 || u1 >= 1) u1 = r()
  while (u2 <= 0 || u2 >= 1) u2 = r()
  const sqrt = Math.sqrt(-2 * Math.log(u1))
  const theta = 2 * Math.PI * u2
  return sqrt * Math.cos(theta)
}

/**
 * Fill an array with N(0,1) samples (reusable buffer for hot loops).
 */
export function normals(n: number, out?: Float64Array, rand?: () => number): Float64Array {
  const arr = out ?? new Float64Array(n)
  for (let i = 0; i < n; i++) arr[i] = normal(rand)
  return arr
}
